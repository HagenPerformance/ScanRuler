# Hagen / EXStar controls

Select **Settings → Mouse controls → Hagen / EXStar**. This profile is opt-in
and stored in the browser. It changes the 3D viewport in Measure, Reverse
engineer and Mesh Tools:

| Input | Action |
| --- | --- |
| Left drag | Orbit, even while a marking tool is armed |
| Middle drag | Pan |
| Shift + left click or drag | Pick or mark |
| Ctrl + left click or drag | Remove a selected item or marking |
| Space | Accept the action currently ready to create |
| Alt + Shift + left drag | Reverse engineer body selection window |

Enter and visible Create/Save buttons still work. A plain left click does not
pick in the 3D viewport. Right click is reserved for existing tool behavior;
it does not accept an action. Touch gestures and the 2D Measure sheet keep
their existing selection controls. The keyboard's Space action does not run
while typing in a field or using a focused button.

The profile is represented in `src/viewer/navSchemes.ts` by the `shiftPick`
flag. The pointer router, marking tool and Reverse engineer layer read that
flag. Further profiles can use the same flag for this interaction pattern;
navigation bindings and labels can then be adjusted independently.

## Keeping this fork current

Keep custom work on a branch and merge or rebase upstream changes into it.
Run `npm ci`, `npm run build`, `npm test`, and `npm run e2e:ci` after updates.
The focused `npm run e2e:hagen` check covers the modifier clicks and Space.
The wider browser suite includes the MCP agent workflow.

The control profile only changes local pointer and keyboard handling. MCP
commands still call the ScanRuler application through its command API and do
not synthesize these mouse gestures. For a fully self-hosted setup, run the
application from this fork and point the agent at this fork's MCP helper, as
described in `mcp/README.md` under **From a clone**. Use its `--app` option
for your own hosted address and `--no-update` to pin that helper version.
Avoid `scanruler-mcp@latest` in an agent configuration when you want updates
to be deliberate. The repository is licensed AGPL-3.0-only; consult `LICENSE`
and the README's License section when hosting or distributing a modified copy.
