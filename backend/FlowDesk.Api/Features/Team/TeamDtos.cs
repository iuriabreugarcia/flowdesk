using System.ComponentModel.DataAnnotations;

namespace FlowDesk.Api.Features.Team;

public sealed record TeamUserResponse(
    Guid Id,
    string Name,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? LastLoginAtUtc);

public sealed record TeamSummaryResponse(
    int TotalUsers,
    int ActiveUsers,
    int InactiveUsers,
    int Administrators);

public sealed record TeamListResponse(
    IReadOnlyList<TeamUserResponse> Items,
    TeamSummaryResponse Summary);

public sealed class CreateTeamMemberRequest
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(160, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o e-mail.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    [StringLength(180)]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Role { get; init; } = "USER";

    [Required(ErrorMessage = "Informe uma senha inicial.")]
    [StringLength(120, MinimumLength = 8, ErrorMessage = "A senha precisa ter ao menos 8 caracteres.")]
    public string Password { get; init; } = string.Empty;
}

public sealed class UpdateTeamMemberRequest
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(160, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required]
    public string Role { get; init; } = "USER";

    public bool IsActive { get; init; } = true;
}

public sealed class ResetTeamMemberPasswordRequest
{
    [Required(ErrorMessage = "Informe a nova senha.")]
    [StringLength(120, MinimumLength = 8, ErrorMessage = "A senha precisa ter ao menos 8 caracteres.")]
    public string NewPassword { get; init; } = string.Empty;
}
