using System.Text.Json;
using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Commands;

public class SaveMlResultCommandHandler : IRequestHandler<SaveMlResultCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;

    public SaveMlResultCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Unit> Handle(SaveMlResultCommand request, CancellationToken ct)
    {
        var jsonDoc = JsonDocument.Parse(request.ResultJson);
        var documentId = jsonDoc.RootElement.GetProperty("document_id").GetString();

        if (documentId == null || !Guid.TryParse(documentId, out var docGuid))
            return Unit.Value;

        var document = await _unitOfWork.Documents.GetByIdAsync(docGuid, Guid.Empty, ct);
        if (document == null)
            return Unit.Value;

        var conclusion = jsonDoc.RootElement.GetProperty("conclusion").GetString();

        document.Status = "analyzed";
        document.MlResult = request.ResultJson;
        document.Conclusion = conclusion;
        document.AnalyzedAt = DateTimeOffset.UtcNow;

        await _unitOfWork.Documents.UpdateAsync(document, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
