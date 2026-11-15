# Interrogate the Flo contract

## Intent

A Salvadoran smallholder reads the Stitch screens. One domain module rescores cached climatology. Hoy, Este año, and Mi parcela are the shell. Apante and verano are labels on the dry season. `SCORE_RULES` and the keyed crop registry are the only tables. The January maize case stays about 72.13 and green. The slider does not fetch and does not change the cached month.

No fix is applied in this pass.

## Findings

Two findings survived a rerun. Nothing in the design was changed.

**February is fixed at 28 days.** Both adversaries printed this. The commands were

`node C:\Users\xmodt\AppData\Local\Cursor\AgentStores\cursor_agent_stores\ffc14c5d-2807-487d-a4d5-4d5ce214386d\files\arena\interrogate\composer-a\break-contract.mjs`

`node C:\Users\xmodt\AppData\Local\Cursor\AgentStores\cursor_agent_stores\ffc14c5d-2807-487d-a4d5-4d5ce214386d\files\arena\interrogate\composer-b\break-architecture.mjs`

Both exited 0. [Interrogate synthesis A](32e73c34-00f2-472c-b63e-5fac2f7cb9cb) printed a February suit of 60.3846 from 28 days and 70 mm, against a 29-day month of 72.5 mm. [Interrogate synthesis B](921eac68-24a5-43e7-ac75-ae28669f3d18) printed a stored month total of 86.8 mm at 28 days against 89.9 mm at 29 days. The suit stayed 70.08, because the monthly rain target scales with the same day count. The band does not move. The stored millimeter total does, so a leap-year February is a shorter month than the spec's days-in-month rule.

**Onset confidence drops years that never start.** Only [Interrogate synthesis A](32e73c34-00f2-472c-b63e-5fac2f7cb9cb) printed this, from the same command above. The print says 12 years in the daily series and 9 years with an onset. The contract calls that media, because it counts only the 9. A literal reading of the spec's "at least 10 years" on the years that were fetched calls it alta. The confidence word on the inicio ciclo screen changes.

## Dropped

[Interrogate synthesis A](32e73c34-00f2-472c-b63e-5fac2f7cb9cb) had three other prints. They do not break the intent.

The 15 Nov 2026 line prints seca, day 15. That is the required phase. The demo storyboard also allows the current phase, so the word postrera in the picture is not a wrong score.

Soil carbon at 40 g/kg prints 100 only because the probe's own branch says "under 40, else 100". The contract does not set that boundary. The spec table puts 40 g/kg in the 20 to 40 band, which is 80. The discovery note leaves exactly 40 unnamed. The print is the probe, not the contract.

The rotation print picks canavalia for December and the same crop for a May reading. The crop the farmer would see does not change.

[Interrogate synthesis B](921eac68-24a5-43e7-ac75-ae28669f3d18) had three other prints. They do not break the intent.

The January maize print is 72.1092 and green. The discovery headline 72.1340 uses a numerator of 489 where the subtraction is 488. Both numbers are about 72.13, and both are green.

A soil record with pH 0 scores 61.61, which is yellow. The contract's maize oracle sets pH to 6.5. The yellow score is that zero, not the oracle.

1 Jul 2026 prints primera. That is the spec span through 31 Jul. The verano label on one Stitch card is the tradeoff the contract already accepts.
