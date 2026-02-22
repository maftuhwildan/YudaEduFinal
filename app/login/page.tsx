import { GalleryVerticalEnd } from "lucide-react"
import Image from "next/image"

import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-8 w-8 items-center justify-center">
              <img src="/logo.png" alt="YudaEdu Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-semibold">YudaEdu</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="https://lnehiiztrdnprfqvwcaz.supabase.co/storage/v1/object/public/image/person-with-books-digital-art-style-education-day.jpg"
          alt="Education Illustration"
          fill
          sizes="50vw"
          priority
          className="object-cover"
        />
      </div>
    </div>
  )
}
