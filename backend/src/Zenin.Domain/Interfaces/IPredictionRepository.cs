using System.Linq.Expressions;
using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IPredictionRepository
{
    Task<int> CountAsync(Expression<Func<Prediction, bool>> predicate, CancellationToken cancellationToken = default);
}
