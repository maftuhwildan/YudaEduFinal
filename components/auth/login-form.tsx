import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Masuk</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Portal Ujian Digital Sekolah
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="username">Username / ID</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Masukkan ID / No. Absen"
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Kata Sandi</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full">
          Masuk
        </Button>
      </div>

    </form>
  )
}
