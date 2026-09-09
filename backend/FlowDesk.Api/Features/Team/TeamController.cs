using System.Security.Claims;
using FlowDesk.Api.Data;
using FlowDesk.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Team;

[ApiController]
[Authorize(Roles = "OWNER,ADMIN")]
[Route("api/team")]
public sealed class TeamController(AppDbContext db) : ControllerBase
{
    private static readonly string[] ValidRoles = ["OWNER", "ADMIN", "MANAGER", "USER"];

    [HttpGet]
    [ProducesResponseType<TeamListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TeamListResponse>> List(
        [FromQuery] string? q = null,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        var baseQuery = db.Users.AsNoTracking().Where(x => x.CompanyId == companyId);

        var total = await baseQuery.CountAsync(cancellationToken);
        var active = await baseQuery.CountAsync(x => x.IsActive, cancellationToken);
        var admins = await baseQuery.CountAsync(x => x.IsActive && (x.Role == "OWNER" || x.Role == "ADMIN"), cancellationToken);

        var query = baseQuery;
        var term = q?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern) || EF.Functions.ILike(x.Email, pattern));
        }

        var normalizedRole = NormalizeRole(role);
        if (normalizedRole is not null)
        {
            query = query.Where(x => x.Role == normalizedRole);
        }

        switch (status?.Trim().ToUpperInvariant())
        {
            case "ACTIVE": query = query.Where(x => x.IsActive); break;
            case "INACTIVE": query = query.Where(x => !x.IsActive); break;
        }

        var items = await query
            .OrderByDescending(x => x.Role == "OWNER")
            .ThenByDescending(x => x.Role == "ADMIN")
            .ThenBy(x => x.Name)
            .Select(x => new TeamUserResponse(x.Id, x.Name, x.Email, x.Role, x.IsActive, x.CreatedAtUtc, x.LastLoginAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(new TeamListResponse(items, new TeamSummaryResponse(total, active, total - active, admins)));
    }

    [HttpPost]
    [ProducesResponseType<TeamUserResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TeamUserResponse>> Create(
        [FromBody] CreateTeamMemberRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var currentRole = GetCurrentRole();
        var role = RequireRole(request.Role);

        if (currentRole != "OWNER" && role == "OWNER")
        {
            return Forbid();
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AsNoTracking().AnyAsync(x => x.Email == email, cancellationToken))
        {
            return Conflict(new { message = "Já existe um usuário com este e-mail." });
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = request.Name.Trim(),
            Email = email,
            Role = role,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/team/{user.Id}", ToResponse(user));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<TeamUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamUserResponse>> Update(
        Guid id,
        [FromBody] UpdateTeamMemberRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var currentUserId = GetCurrentUserId();
        var currentRole = GetCurrentRole();
        var target = await db.Users.SingleOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);
        if (target is null) return NotFound(new { message = "Usuário não encontrado." });

        var newRole = RequireRole(request.Role);
        if (!CanManage(currentRole, target.Role, newRole)) return Forbid();
        if (target.Id == currentUserId && (!request.IsActive || newRole != target.Role))
        {
            return BadRequest(new { message = "Você não pode desativar sua própria conta nem alterar sua própria função." });
        }

        target.Name = request.Name.Trim();
        target.Role = newRole;
        target.IsActive = request.IsActive;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(target));
    }

    [HttpPost("{id:guid}/reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword(
        Guid id,
        [FromBody] ResetTeamMemberPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var currentRole = GetCurrentRole();
        var target = await db.Users.SingleOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);
        if (target is null) return NotFound(new { message = "Usuário não encontrado." });
        if (!CanManage(currentRole, target.Role, target.Role)) return Forbid();

        target.PasswordHash = new PasswordHasher<User>().HashPassword(target, request.NewPassword);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Guid GetCompanyId() => Guid.TryParse(User.FindFirstValue("companyId"), out var id)
        ? id : throw new UnauthorizedAccessException("Token sem empresa válida.");

    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(raw, out var id) ? id : throw new UnauthorizedAccessException("Token sem usuário válido.");
    }

    private string GetCurrentRole() => (User.FindFirstValue(ClaimTypes.Role) ?? "USER").ToUpperInvariant();

    private static string RequireRole(string? value)
    {
        var role = NormalizeRole(value);
        if (role is null) throw new ArgumentException("Função inválida.");
        return role;
    }

    private static string? NormalizeRole(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var role = value.Trim().ToUpperInvariant();
        return ValidRoles.Contains(role) ? role : null;
    }

    private static bool CanManage(string currentRole, string targetRole, string newRole)
    {
        if (currentRole == "OWNER") return true;
        if (currentRole != "ADMIN") return false;
        return targetRole != "OWNER" && newRole != "OWNER";
    }

    private static TeamUserResponse ToResponse(User user) => new(
        user.Id, user.Name, user.Email, user.Role, user.IsActive, user.CreatedAtUtc, user.LastLoginAtUtc);
}
