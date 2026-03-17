using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class PredictionRepository : IPredictionRepository
{
    private readonly ApplicationDbContext _context;

    public PredictionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> CountAsync(Expression<Func<Prediction, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _context.Predictions.CountAsync(predicate, cancellationToken);
    }
}
