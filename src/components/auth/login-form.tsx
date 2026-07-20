"use client"

import { useActionState, useState } from "react"
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react"
import { loginAction, type LoginState } from "@/actions/auth"
import { Button } from "@/components/ui/button"

const initialState: LoginState = {}

function SubmitButton({ pending }: { pending: boolean }) {
  return <Button type="submit" loading={pending} className="mt-2 w-full">
    {!pending && <LogIn className="size-4" />}{pending ? "正在登录…" : "登录"}
  </Button>
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)
  return <form action={action} className="space-y-5">
    <div>
      <label htmlFor="username" className="field-label">账号</label>
      <input id="username" name="username" className="control" autoComplete="username" autoFocus required placeholder="输入管理员账号" />
    </div>
    <div>
      <label htmlFor="password" className="field-label">密码</label>
      <div className="relative">
        <input id="password" name="password" type={showPassword ? "text" : "password"} className="control pr-12" autoComplete="current-password" required placeholder="输入管理员密码" />
        <button type="button" className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
    {state.error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--danger-soft)] px-3.5 py-3 text-sm leading-5 text-[var(--danger)]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{state.error}</div>}
    <SubmitButton pending={pending} />
  </form>
}
