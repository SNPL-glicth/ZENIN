using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Zenin.Application.Features.Chats.Queries;
using Zenin.Application.Features.Chats.Commands;
using Zenin.Domain.Interfaces;
using Zenin.Infrastructure.Persistence;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/chat-sessions")]
[Authorize]
public class ChatsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;

    public ChatsController(IMediator mediator, IUnitOfWork unitOfWork, ApplicationDbContext context)
    {
        _mediator = mediator;
        _unitOfWork = unitOfWork;
        _context = context;
    }

    /// <summary>
    /// Get all chat sessions for the authenticated user.
    /// Groups documents by session/conversation.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetChatSessions()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var query = new ListChatsQuery(tenantId.Value);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Create a new chat session.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateChatSession()
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();
        if (tenantId == null || userId == null) return Unauthorized();

        var command = new CreateChatCommand(tenantId.Value, userId.Value);
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Get a specific chat session with all its messages.
    /// Returns 404 only if session doesn't exist (not if it has no messages).
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetChatSession(Guid id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        // Check if session exists and belongs to tenant first
        var session = await _unitOfWork.ChatSessions.GetByIdAsync(id, CancellationToken.None);
        if (session == null || session.TenantId != tenantId.Value || session.IsDeleted)
            return NotFound();

        var query = new GetChatMessagesQuery(id, tenantId.Value);
        var messages = await _mediator.Send(query);

        return Ok(new { 
            id = id,
            messages = messages,
            messageCount = messages.Count
        });
    }

    /// <summary>
    /// Add a message to a chat session.
    /// POST /api/chat-sessions/{id}/messages
    /// </summary>
    [HttpPost("{id}/messages")]
    public async Task<IActionResult> AddMessage(Guid id, [FromBody] AddMessageRequest request)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var command = new AddMessageCommand(
            id,
            tenantId.Value,
            request.Role,
            request.Content,
            request.AnalysisResultId
        );

        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Delete a chat session.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteChatSession(Guid id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var command = new DeleteChatCommand(id, tenantId.Value);
        var deleted = await _mediator.Send(command);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>
    /// Reset all user data (chat sessions, messages, and analysis results).
    /// POST /api/chat-sessions/reset
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetUserData()
    {
        var tenantId = GetTenantId();
        var userId = GetUserId();
        if (tenantId == null || userId == null) return Unauthorized();

        var command = new Zenin.Application.Features.Users.Commands.ResetUserDataCommand(tenantId.Value, userId.Value);
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Bulk delete chat sessions.
    /// Uses single transaction to avoid deadlocks.
    /// </summary>
    [HttpDelete("bulk")]
    public async Task<IActionResult> BulkDeleteChatSessions([FromBody] BulkDeleteChatsRequest request)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        // Use single SQL UPDATE for bulk soft delete to avoid deadlocks
        // This updates all matching rows in one transaction
        var ids = request.Ids.ToList();
        if (ids.Count == 0)
            return Ok(new { deletedCount = 0 });

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Build parameterized query to prevent SQL injection
            var idPlaceholders = string.Join(",", ids.Select((_, i) => $"@p{i}"));
            var parameters = ids.Select((id, i) => new Microsoft.Data.SqlClient.SqlParameter($"@p{i}", id)).ToList();
            parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@tenantId", tenantId.Value));

            var sql = $@"
                UPDATE zenin_chat.chat_sessions 
                SET is_deleted = 1 
                WHERE id IN ({idPlaceholders}) 
                AND tenant_id = @tenantId
                AND is_deleted = 0";

            var rowsAffected = await _context.Database.ExecuteSqlRawAsync(sql, parameters);
            
            await transaction.CommitAsync();

            return Ok(new { deletedCount = rowsAffected });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { error = "Bulk delete failed", details = ex.Message });
        }
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirst("sub")?.Value ?? User.FindFirst("user_id")?.Value, out var id) ? id : null;

    /// <summary>
    /// DEBUG: Get all sessions including deleted ones to diagnose ghost sessions.
    /// </summary>
    [HttpGet("debug/all")]
    public async Task<IActionResult> DebugGetAllSessions()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        // Raw SQL to see actual database state
        var sql = @"
            SELECT id, title, is_deleted, tenant_id, user_id, created_at, updated_at
            FROM zenin_chat.chat_sessions 
            WHERE tenant_id = @tenantId
            ORDER BY created_at DESC";

        var parameters = new[] { new Microsoft.Data.SqlClient.SqlParameter("@tenantId", tenantId.Value) };
        
        var allSessions = await _context.Database
            .SqlQueryRaw<DebugSessionDto>(sql, parameters)
            .ToListAsync();

        return Ok(new { 
            total = allSessions.Count,
            active = allSessions.Count(s => !s.IsDeleted),
            deleted = allSessions.Count(s => s.IsDeleted),
            sessions = allSessions
        });
    }
}

public class DebugSessionDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public bool IsDeleted { get; set; }
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AddMessageRequest
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public Guid? AnalysisResultId { get; set; }
}

public class BulkDeleteChatsRequest
{
    public List<Guid> Ids { get; set; } = new();
}
