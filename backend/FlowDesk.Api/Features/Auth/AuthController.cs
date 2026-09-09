using FlowDesk.Api.Data;
using FlowDesk.Api.Domain.Entities;
using FlowDesk.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    AppDbContext db,
    JwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("login")]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await db.Users
            .Include(x => x.Company)
            .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return Unauthorized(new { message = "E-mail ou senha inválidos." });
        }

        var passwordResult = new PasswordHasher<User>()
            .VerifyHashedPassword(user, user.PasswordHash, request.Password);

        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "E-mail ou senha inválidos." });
        }

        user.LastLoginAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        var token = jwtTokenService.CreateAccessToken(user);

        return Ok(new LoginResponse(
            token.AccessToken,
            token.ExpiresAtUtc,
            new AuthUserResponse(
                user.Id,
                user.Name,
                user.Email,
                user.Role,
                user.CompanyId,
                user.Company.Name)));
    }
}
