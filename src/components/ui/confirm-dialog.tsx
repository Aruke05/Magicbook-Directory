"use client"

import { useState, useTransition } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "./button"

export function ConfirmDialog({ trigger, title, description, confirmLabel = "删除", onConfirm }: { trigger: React.ReactElement; title: string; description: string; confirmLabel?: string; onConfirm: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const confirm = () => startTransition(async () => { await onConfirm(); setOpen(false) })
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--dialog-radius)] border border-white/70 bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-floating)] focus:outline-none">
        <div className="mb-4 grid size-10 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]"><AlertTriangle className="size-5" /></div>
        <Dialog.Title className="m-0 text-lg font-semibold tracking-[-0.02em]">{title}</Dialog.Title>
        <Dialog.Description className="mb-0 mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">{description}</Dialog.Description>
        <div className="mt-6 flex justify-end gap-2"><Dialog.Close asChild><Button variant="secondary">取消</Button></Dialog.Close><Button variant="danger" loading={pending} onClick={confirm}>{confirmLabel}</Button></div>
        <Dialog.Close className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]" aria-label="关闭确认弹窗"><X className="size-4" /></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
