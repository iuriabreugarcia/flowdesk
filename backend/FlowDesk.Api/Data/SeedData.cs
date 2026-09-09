using FlowDesk.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FlowDesk.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        var company = await db.Companies.SingleOrDefaultAsync(x => x.Slug == "flowdesk-demo");

        if (company is null)
        {
            company = new Company
            {
                Id = Guid.NewGuid(),
                Name = "FlowDesk Demo",
                Slug = "flowdesk-demo",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Companies.Add(company);
        }

        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == "admin@flowdesk.dev");
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                CompanyId = company.Id,
                Company = company,
                Name = "Admin Demo",
                Email = "admin@flowdesk.dev",
                Role = "OWNER",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "FlowDesk@123");
            db.Users.Add(user);
        }

        await db.SaveChangesAsync();

        var teamSeeds = new[]
        {
            new { Name = "Admin Operacional", Email = "admin.ops@flowdesk.dev", Role = "ADMIN", Active = true },
            new { Name = "Marina Gestora", Email = "gestor@flowdesk.dev", Role = "MANAGER", Active = true },
            new { Name = "Lucas Operador", Email = "operador@flowdesk.dev", Role = "USER", Active = true },
            new { Name = "Suporte Inativo", Email = "suporte@flowdesk.dev", Role = "USER", Active = false }
        };

        foreach (var seed in teamSeeds)
        {
            var member = await db.Users.SingleOrDefaultAsync(x => x.Email == seed.Email);
            if (member is not null) continue;

            member = new User
            {
                Id = Guid.NewGuid(),
                CompanyId = company.Id,
                Name = seed.Name,
                Email = seed.Email,
                Role = seed.Role,
                IsActive = seed.Active,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-12)
            };
            member.PasswordHash = new PasswordHasher<User>().HashPassword(member, "FlowDesk@123");
            db.Users.Add(member);
        }

        await db.SaveChangesAsync();

        if (!await db.Customers.AnyAsync(x => x.CompanyId == company.Id))
        {
            var now = DateTime.UtcNow;
            db.Customers.AddRange(
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Aurora Design", Email = "contato@auroradesign.com", Phone = "(71) 99120-4831", Document = "12.345.678/0001-90", Notes = "Cliente recorrente de projetos corporativos.", IsActive = true, CreatedAtUtc = now.AddDays(-42), UpdatedAtUtc = now.AddDays(-2) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Bruno Almeida", Email = "bruno.almeida@email.com", Phone = "(71) 98842-1203", Document = "123.456.789-10", IsActive = true, CreatedAtUtc = now.AddDays(-31), UpdatedAtUtc = now.AddDays(-8) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Casa Norte Arquitetura", Email = "financeiro@casanorte.com", Phone = "(11) 99741-2840", Document = "45.687.210/0001-52", Notes = "Contato principal: Mariana.", IsActive = true, CreatedAtUtc = now.AddDays(-26), UpdatedAtUtc = now.AddDays(-4) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Daniel Souza", Email = "daniel.souza@email.com", Phone = "(71) 98220-7781", Document = "087.321.654-22", IsActive = true, CreatedAtUtc = now.AddDays(-20), UpdatedAtUtc = now.AddDays(-20) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Estúdio Lume", Email = "ola@estudiolume.com", Phone = "(21) 99215-6301", Document = "31.998.274/0001-07", Notes = "Prefere contato por WhatsApp.", IsActive = true, CreatedAtUtc = now.AddDays(-17), UpdatedAtUtc = now.AddDays(-1) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Fernanda Lima", Email = "fernanda.lima@email.com", Phone = "(71) 99913-4027", Document = "742.108.963-55", IsActive = true, CreatedAtUtc = now.AddDays(-11), UpdatedAtUtc = now.AddDays(-5) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Grupo Horizonte", Email = "compras@grupohorizonte.com", Phone = "(31) 99814-5522", Document = "09.221.785/0001-43", Notes = "Conta B2B com múltiplos responsáveis.", IsActive = true, CreatedAtUtc = now.AddDays(-8), UpdatedAtUtc = now.AddHours(-18) },
                new Customer { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Helena Martins", Email = "helena.martins@email.com", Phone = "(71) 98442-9980", Document = "512.304.876-09", IsActive = true, CreatedAtUtc = now.AddDays(-3), UpdatedAtUtc = now.AddDays(-3) }
            );
            await db.SaveChangesAsync();
        }
        else
        {
            await db.SaveChangesAsync();
        }

        if (!await db.Orders.AnyAsync(x => x.CompanyId == company.Id))
        {
            var customers = await db.Customers.Where(x => x.CompanyId == company.Id).OrderBy(x => x.Name).ToListAsync();
            var now = DateTime.UtcNow;
            var seeds = new[]
            {
                new { Customer = "Aurora Design", Title = "Implantação do painel operacional", Status = "NEW", Priority = "HIGH", Value = 1240m, Due = 4, Created = 2 },
                new { Customer = "Bruno Almeida", Title = "Ajuste de integração comercial", Status = "IN_PROGRESS", Priority = "NORMAL", Value = 680m, Due = 2, Created = 5 },
                new { Customer = "Casa Norte Arquitetura", Title = "Revisão do fluxo de atendimento", Status = "WAITING", Priority = "URGENT", Value = 2300m, Due = 1, Created = 7 },
                new { Customer = "Estúdio Lume", Title = "Automação de relatórios", Status = "DONE", Priority = "NORMAL", Value = 950m, Due = -2, Created = 13 },
                new { Customer = "Fernanda Lima", Title = "Configuração do portal do cliente", Status = "NEW", Priority = "LOW", Value = 420m, Due = 8, Created = 1 },
                new { Customer = "Grupo Horizonte", Title = "Integração de pedidos B2B", Status = "IN_PROGRESS", Priority = "HIGH", Value = 3850m, Due = 5, Created = 10 },
                new { Customer = "Helena Martins", Title = "Personalização do dashboard", Status = "WAITING", Priority = "NORMAL", Value = 760m, Due = 3, Created = 4 },
                new { Customer = "Daniel Souza", Title = "Migração de dados legados", Status = "DONE", Priority = "HIGH", Value = 1600m, Due = -7, Created = 20 }
            };

            var sequence = 0;
            foreach (var seed in seeds)
            {
                sequence++;
                var customer = customers.First(x => x.Name == seed.Customer);
                var createdAt = now.AddDays(-seed.Created);
                var statusChangedAt = createdAt.AddHours(5);
                var order = new ServiceOrder
                {
                    Id = Guid.NewGuid(), CompanyId = company.Id, CustomerId = customer.Id, AssignedUserId = user.Id,
                    SequenceNumber = sequence, Number = $"OS-{now.Year}-{sequence:0000}", Title = seed.Title,
                    Description = $"Atendimento planejado para {seed.Customer}.", Status = seed.Status, Priority = seed.Priority,
                    EstimatedValue = seed.Value, DueDateUtc = now.AddDays(seed.Due), CreatedAtUtc = createdAt,
                    UpdatedAtUtc = statusChangedAt,
                    StartedAtUtc = seed.Status is "IN_PROGRESS" or "WAITING" or "DONE" ? statusChangedAt : null,
                    CompletedAtUtc = seed.Status == "DONE" ? statusChangedAt.AddDays(1) : null
                };
                db.Orders.Add(order);
                db.OrderActivities.Add(new OrderActivity
                {
                    Id = Guid.NewGuid(), CompanyId = company.Id, OrderId = order.Id, UserId = user.Id,
                    Type = "CREATED", Description = "Ordem de serviço criada.", ToValue = "NEW", CreatedAtUtc = createdAt
                });
                if (seed.Status != "NEW")
                {
                    db.OrderActivities.Add(new OrderActivity
                    {
                        Id = Guid.NewGuid(), CompanyId = company.Id, OrderId = order.Id, UserId = user.Id,
                        Type = "STATUS_CHANGED", Description = $"Status atualizado para {StatusLabel(seed.Status)}.",
                        FromValue = "NEW", ToValue = seed.Status, CreatedAtUtc = statusChangedAt
                    });
                }
            }

            // Persiste o lote atual antes de calcular a sequência do histórico.
            // Sem isso, o MaxAsync abaixo não enxerga as ordens ainda pendentes no
            // ChangeTracker e o histórico pode tentar reutilizar OS-YYYY-0001 etc.
            await db.SaveChangesAsync();
        }

        // Histórico idempotente para deixar os gráficos de Analytics interessantes sem
        // depender de dados fictícios no frontend. Só é criado quando a empresa ainda
        // não possui ordens com mais de 35 dias.
        if (!await db.Orders.AnyAsync(x => x.CompanyId == company.Id && x.CreatedAtUtc < DateTime.UtcNow.AddDays(-35)))
        {
            var historicalCustomers = await db.Customers
                .Where(x => x.CompanyId == company.Id && x.IsActive)
                .OrderBy(x => x.Name)
                .ToListAsync();

            var historicalSeeds = new[]
            {
                new { MonthsAgo = 6, Value = 1850m, Title = "Otimização do atendimento digital" },
                new { MonthsAgo = 5, Value = 2420m, Title = "Automação do fluxo comercial" },
                new { MonthsAgo = 4, Value = 3180m, Title = "Implantação de indicadores operacionais" },
                new { MonthsAgo = 3, Value = 2760m, Title = "Integração de processos internos" },
                new { MonthsAgo = 2, Value = 4150m, Title = "Evolução do portal corporativo" },
                new { MonthsAgo = 1, Value = 3640m, Title = "Modernização da jornada do cliente" }
            };

            var nextSequence = (await db.Orders
                .Where(x => x.CompanyId == company.Id)
                .MaxAsync(x => (int?)x.SequenceNumber) ?? 0) + 1;

            for (var index = 0; index < historicalSeeds.Length; index++)
            {
                var seed = historicalSeeds[index];
                var customer = historicalCustomers[index % historicalCustomers.Count];
                var createdAt = DateTime.UtcNow.AddMonths(-seed.MonthsAgo).AddDays(-4);
                var startedAt = createdAt.AddHours(8);
                var completedAt = createdAt.AddDays(3);

                var sequence = nextSequence;
                var number = $"OS-{createdAt.Year}-{sequence:0000}";

                // Proteção extra para ambientes em que versões anteriores do seed
                // tenham sido executadas parcialmente.
                while (await db.Orders.AnyAsync(
                    x => x.CompanyId == company.Id &&
                         (x.SequenceNumber == sequence || x.Number == number)))
                {
                    sequence++;
                    number = $"OS-{createdAt.Year}-{sequence:0000}";
                }

                nextSequence = sequence + 1;

                var order = new ServiceOrder
                {
                    Id = Guid.NewGuid(),
                    CompanyId = company.Id,
                    CustomerId = customer.Id,
                    AssignedUserId = user.Id,
                    SequenceNumber = sequence,
                    Number = number,
                    Title = seed.Title,
                    Description = $"Projeto concluído para {customer.Name} e utilizado na demonstração histórica de Analytics.",
                    Status = "DONE",
                    Priority = index % 2 == 0 ? "HIGH" : "NORMAL",
                    EstimatedValue = seed.Value,
                    DueDateUtc = createdAt.AddDays(6),
                    StartedAtUtc = startedAt,
                    CompletedAtUtc = completedAt,
                    CreatedAtUtc = createdAt,
                    UpdatedAtUtc = completedAt
                };

                db.Orders.Add(order);
                db.OrderActivities.AddRange(
                    new OrderActivity
                    {
                        Id = Guid.NewGuid(), CompanyId = company.Id, OrderId = order.Id, UserId = user.Id,
                        Type = "CREATED", Description = "Ordem de serviço criada.", ToValue = "NEW", CreatedAtUtc = createdAt
                    },
                    new OrderActivity
                    {
                        Id = Guid.NewGuid(), CompanyId = company.Id, OrderId = order.Id, UserId = user.Id,
                        Type = "STATUS_CHANGED", Description = "Status atualizado para Finalizada.",
                        FromValue = "NEW", ToValue = "DONE", CreatedAtUtc = completedAt
                    });
            }

            await db.SaveChangesAsync();
        }

        var productSeeds = new[]
        {
            new { Sku = "HW-SSD-001", Name = "SSD NVMe 1TB", Category = "Hardware", Unit = "UN", Cost = 310m, Sale = 459.90m, Stock = 12m, Min = 4m },
            new { Sku = "HW-RAM-016", Name = "Memória DDR4 16GB", Category = "Hardware", Unit = "UN", Cost = 165m, Sale = 249.90m, Stock = 3m, Min = 5m },
            new { Sku = "PER-MOU-001", Name = "Mouse sem fio", Category = "Periféricos", Unit = "UN", Cost = 52m, Sale = 89.90m, Stock = 18m, Min = 6m },
            new { Sku = "PER-TEC-002", Name = "Teclado mecânico ABNT2", Category = "Periféricos", Unit = "UN", Cost = 178m, Sale = 289.90m, Stock = 0m, Min = 3m },
            new { Sku = "ACE-HUB-007", Name = "Hub USB-C 7 portas", Category = "Acessórios", Unit = "UN", Cost = 118m, Sale = 189.90m, Stock = 5m, Min = 5m },
            new { Sku = "ACE-HDM-002", Name = "Cabo HDMI 2.1 2m", Category = "Acessórios", Unit = "UN", Cost = 28m, Sale = 49.90m, Stock = 26m, Min = 8m },
            new { Sku = "PER-WEB-108", Name = "Webcam Full HD", Category = "Periféricos", Unit = "UN", Cost = 142m, Sale = 219.90m, Stock = 2m, Min = 4m },
            new { Sku = "ACE-FON-065", Name = "Fonte USB-C 65W", Category = "Acessórios", Unit = "UN", Cost = 86m, Sale = 139.90m, Stock = 9m, Min = 4m },
            new { Sku = "SUP-ETQ-100", Name = "Etiqueta térmica 100x50", Category = "Suprimentos", Unit = "RL", Cost = 31m, Sale = 54.90m, Stock = 14m, Min = 6m },
            new { Sku = "LIC-PRO-001", Name = "Licença FlowDesk Pro", Category = "Licenças", Unit = "UN", Cost = 0m, Sale = 149.90m, Stock = 50m, Min = 10m }
        };

        var productIndex = 0;
        foreach (var seed in productSeeds)
        {
            productIndex++;

            var existingProduct = await db.Products.SingleOrDefaultAsync(
                x => x.CompanyId == company.Id && x.Sku == seed.Sku);

            if (existingProduct is not null)
            {
                if (!existingProduct.IsActive)
                {
                    existingProduct.IsActive = true;
                    existingProduct.UpdatedAtUtc = DateTime.UtcNow;
                }

                continue;
            }

            var createdAt = DateTime.UtcNow.AddDays(-(18 - productIndex));
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CompanyId = company.Id,
                Sku = seed.Sku,
                Name = seed.Name,
                Category = seed.Category,
                Unit = seed.Unit,
                CostPrice = seed.Cost,
                SalePrice = seed.Sale,
                CurrentStock = seed.Stock,
                MinimumStock = seed.Min,
                IsActive = true,
                CreatedAtUtc = createdAt,
                UpdatedAtUtc = createdAt
            };

            db.Products.Add(product);

            if (seed.Stock > 0)
            {
                db.StockMovements.Add(new StockMovement
                {
                    Id = Guid.NewGuid(),
                    CompanyId = company.Id,
                    ProductId = product.Id,
                    UserId = user.Id,
                    Type = "INITIAL",
                    Quantity = seed.Stock,
                    StockBefore = 0,
                    StockAfter = seed.Stock,
                    Note = "Saldo inicial de demonstração.",
                    CreatedAtUtc = createdAt
                });
            }
        }

        await db.SaveChangesAsync();

        var activeProducts = await db.Products.CountAsync(x => x.CompanyId == company.Id && x.IsActive);
        Console.WriteLine($"[FlowDesk Seed] Produtos ativos da empresa demo: {activeProducts}");
    }

    private static string StatusLabel(string status) => status switch
    {
        "IN_PROGRESS" => "Em andamento",
        "WAITING" => "Aguardando",
        "DONE" => "Finalizada",
        _ => "Nova"
    };
}
