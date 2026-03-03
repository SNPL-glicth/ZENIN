#!/usr/bin/env dotnet-script
#r "nuget: BCrypt.Net-Next, 4.0.3"

using BCrypt.Net;

// Generar hash para password: admin123
var password = "admin123";
var hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

Console.WriteLine("Password: admin123");
Console.WriteLine($"BCrypt Hash: {hash}");
Console.WriteLine();
Console.WriteLine("SQL Script:");
Console.WriteLine($"UPDATE \"Users\" SET \"PasswordHash\" = '{hash}' WHERE \"Email\" = 'admin';");
