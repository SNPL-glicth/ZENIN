using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class PatternRepository : IPatternRepository
{
    private readonly ApplicationDbContext _context;

    public PatternRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> CountAsync(Expression<Func<Pattern, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _context.Patterns.CountAsync(predicate, cancellationToken);
    }
}
