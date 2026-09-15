# Guidance Hub — Guidelines

## Components

The design system exports these components — import them from `@ws-7eb7e713de717d6d83a6/ff86189b-6cdb-4a8a-b190-a1c210e48686` and compose them before building anything from scratch:

`AiDraftAssistant`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogOverlay`, `AlertDialogPortal`, `AlertDialogTitle`, `AlertDialogTrigger`, `AlertDialog`, `AppLayout`, `Button`, `CompactKpiDashboard`, `Constants`, `Copyright`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`, `Dialog`, `DropdownMenuCheckboxItem`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuPortal`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuSub`, `DropdownMenuTrigger`, `DropdownMenu`, `EvidenceGallery`, `EvidenceUploadDialog`, `Input`, `Label`, `NoorImportDialog`, `OfficialFooter`, `OfficialHeader`, `PlanGate`, `PopoverAnchor`, `PopoverContent`, `PopoverTrigger`, `Popover`, `RecordAttachmentsDialog`, `RecordPage`, `RecordPrintDialog`, `SignaturePad`, `StudentCombobox`, `StudentsPage`, `Textarea`, `ThemePicker`, `ThemeProvider`, `WhatsAppButton`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-7eb7e713de717d6d83a6/ff86189b-6cdb-4a8a-b190-a1c210e48686/styles.css` (source — preferred import)
- `@ws-7eb7e713de717d6d83a6/ff86189b-6cdb-4a8a-b190-a1c210e48686/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

