using System.Security.Claims;
using FlowDesk.Api.Data;
using FlowDesk.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Features.Customers;

[ApiController]
[Authorize]
[Route("api/customers")]
public sealed class CustomersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResponse<CustomerListItemResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<CustomerListItemResponse>>> List(
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 5, 50);

        var query = db.Customers
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.IsActive);

        var term = q?.Trim();

        if (!string.IsNullOrWhiteSpace(term))
        {
            var pattern = $"%{term}%";
            query = query.Where(x =>
                EF.Functions.ILike(x.Name, pattern) ||
                (x.Email != null && EF.Functions.ILike(x.Email, pattern)) ||
                (x.Phone != null && EF.Functions.ILike(x.Phone, pattern)) ||
                (x.Document != null && EF.Functions.ILike(x.Document, pattern)));
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize);

        if (totalPages > 0 && page > totalPages)
        {
            page = totalPages;
        }

        var items = await query
            .OrderBy(x => x.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new CustomerListItemResponse(
                x.Id,
                x.Name,
                x.Email,
                x.Phone,
                x.Document,
                x.CreatedAtUtc,
                x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(new PagedResponse<CustomerListItemResponse>(
            items,
            page,
            pageSize,
            totalItems,
            totalPages));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<CustomerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();

        var customer = await db.Customers
            .AsNoTracking()
            .Where(x => x.Id == id && x.CompanyId == companyId && x.IsActive)
            .Select(x => new CustomerResponse(
                x.Id,
                x.Name,
                x.Email,
                x.Phone,
                x.Document,
                x.Notes,
                x.CreatedAtUtc,
                x.UpdatedAtUtc))
            .SingleOrDefaultAsync(cancellationToken);

        return customer is null
            ? NotFound(new { message = "Cliente não encontrado." })
            : Ok(customer);
    }

    [HttpPost]
    [ProducesResponseType<CustomerResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponse>> Create(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var email = NormalizeOptional(request.Email, lowerCase: true);
        var document = NormalizeOptional(request.Document);

        if (await HasDuplicateAsync(companyId, email, document, null, cancellationToken))
        {
            return Conflict(new { message = "Já existe um cliente com este e-mail ou documento." });
        }

        var now = DateTime.UtcNow;
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = request.Name.Trim(),
            Email = email,
            Phone = NormalizeOptional(request.Phone),
            Document = document,
            Notes = NormalizeOptional(request.Notes),
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync(cancellationToken);

        var response = ToResponse(customer);
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<CustomerResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponse>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var customer = await db.Customers
            .SingleOrDefaultAsync(
                x => x.Id == id && x.CompanyId == companyId && x.IsActive,
                cancellationToken);

        if (customer is null)
        {
            return NotFound(new { message = "Cliente não encontrado." });
        }

        var email = NormalizeOptional(request.Email, lowerCase: true);
        var document = NormalizeOptional(request.Document);

        if (await HasDuplicateAsync(companyId, email, document, id, cancellationToken))
        {
            return Conflict(new { message = "Já existe outro cliente com este e-mail ou documento." });
        }

        customer.Name = request.Name.Trim();
        customer.Email = email;
        customer.Phone = NormalizeOptional(request.Phone);
        customer.Document = document;
        customer.Notes = NormalizeOptional(request.Notes);
        customer.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(customer));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "OWNER,ADMIN,MANAGER")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var customer = await db.Customers
            .SingleOrDefaultAsync(
                x => x.Id == id && x.CompanyId == companyId && x.IsActive,
                cancellationToken);

        if (customer is null)
        {
            return NotFound(new { message = "Cliente não encontrado." });
        }

        customer.IsActive = false;
        customer.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private Guid GetCompanyId()
    {
        var rawCompanyId = User.FindFirstValue("companyId");

        if (!Guid.TryParse(rawCompanyId, out var companyId))
        {
            throw new UnauthorizedAccessException("Token sem empresa válida.");
        }

        return companyId;
    }

    private async Task<bool> HasDuplicateAsync(
        Guid companyId,
        string? email,
        string? document,
        Guid? ignoreId,
        CancellationToken cancellationToken)
    {
        if (email is null && document is null)
        {
            return false;
        }

        return await db.Customers
            .AsNoTracking()
            .AnyAsync(x =>
                x.CompanyId == companyId &&
                x.IsActive &&
                (!ignoreId.HasValue || x.Id != ignoreId.Value) &&
                ((email != null && x.Email == email) ||
                 (document != null && x.Document == document)),
                cancellationToken);
    }

    private static string? NormalizeOptional(string? value, bool lowerCase = false)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return lowerCase ? normalized.ToLowerInvariant() : normalized;
    }

    private static CustomerResponse ToResponse(Customer customer) => new(
        customer.Id,
        customer.Name,
        customer.Email,
        customer.Phone,
        customer.Document,
        customer.Notes,
        customer.CreatedAtUtc,
        customer.UpdatedAtUtc);
}
