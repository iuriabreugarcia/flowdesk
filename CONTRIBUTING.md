# Contribuindo

1. Crie uma branch a partir de `develop`.
2. Faça alterações pequenas e coesas.
3. Execute `scripts/verify.ps1`.
4. Para mudanças que afetam Docker, execute também `scripts/smoke.ps1` após subir a stack.
5. Abra PR descrevendo comportamento anterior, comportamento novo e evidências de teste.

## Commits sugeridos

- `feat:` funcionalidade
- `fix:` correção
- `test:` testes
- `docs:` documentação
- `refactor:` refatoração sem mudança de comportamento
- `chore:` infraestrutura/manutenção
