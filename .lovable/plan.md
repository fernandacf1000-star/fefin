

## Plan: Update NewExpenseSheet.tsx styling from destructive/red to gradient-emerald theme

The user's code has the same logic as the current file but with styling changes throughout. The JSX tags were stripped by chat rendering, but comparing the non-tag content reveals the differences. Here are the specific changes:

### Changes to make

1. **Tela 1 - Tipo toggle (lines 338-341)**: Despesa button `bg-destructive text-destructive-foreground` → `gradient-emerald text-primary-foreground`

2. **Tela 1 - Tipo toggle (lines 347-349)**: Receita button `bg-primary text-primary-foreground` → `gradient-emerald text-primary-foreground`

3. **Tela 1 - Sugestao "Ignorar" button (line 369)**: Replace `recusarSugestao` call with inline `{ setSugestaoSubcat(null); setSugestaoMacro(null); }` and add `ml-1` class

4. **Remove `recusarSugestao` function (line 159)**: No longer needed

5. **Tela 1 - Continuar button (lines 403-413)**: Replace conditional destructive/primary styling with unified `gradient-emerald hover:opacity-90 text-primary-foreground`

6. **Tela 2 - "Minha despesa" toggle (lines 424-426)**: `bg-destructive text-destructive-foreground` → `gradient-emerald text-primary-foreground`

7. **Tela 2 - Categoria pills (lines 483-486)**: `bg-destructive text-destructive-foreground` → `gradient-emerald text-primary-foreground`

8. **Tela 2 - Forma pagamento pills (lines 506-509)**: `bg-destructive text-destructive-foreground` → `gradient-emerald text-primary-foreground`

9. **Tela 2 - Cartão selection (lines 523-526)**: `border-destructive text-destructive bg-destructive/10` → `border-primary text-primary bg-primary/10`

10. **Tela 2 - Save button (line 620)**: Normal despesa `bg-destructive hover:bg-destructive/90 text-destructive-foreground` → `gradient-emerald hover:opacity-90 text-primary-foreground`

11. **Tela 2 Receita - Category pills (lines 636-639)**: `bg-primary text-primary-foreground` → `gradient-emerald text-primary-foreground`

12. **Despesa save logic (lines 214-218)**: Simplify variable names from `subcatPaisValue/subcatValue/catMacroValue` to `fp/cId` pattern (extract `formaPagamento` logic to shared variables)

All changes are CSS class swaps within the same file. No other files touched.

