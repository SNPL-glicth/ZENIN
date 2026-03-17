using System.Linq.Expressions;
using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IPatternRepository
{
    Task<int> CountAsync(Expression<Func<Pattern, bool>> predicate, CancellationToken cancellationToken = default);
}
