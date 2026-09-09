namespace FlowDesk.Api.Features.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record AuthUserResponse(
    Guid Id,
    string Name,
    string Email,
    string Role,
    Guid CompanyId,
    string CompanyName);

public sealed record LoginResponse(
    string AccessToken,
    DateTime ExpiresAtUtc,
    AuthUserResponse User);
