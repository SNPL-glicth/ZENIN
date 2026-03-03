namespace Zenin.Application.Services;

/// <summary>
/// Service for hashing and verifying passwords using BCrypt
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// Hash a plain text password
    /// </summary>
    string HashPassword(string password);
    
    /// <summary>
    /// Verify a plain text password against a hash
    /// </summary>
    bool VerifyPassword(string password, string passwordHash);
}
