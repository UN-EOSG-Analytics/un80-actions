import { LoginForm } from "@/features/auth/ui/LoginForm";
import { DevLoginButton } from "@/features/auth/ui/DevLoginButton";

export default function LoginPage() {
  const isDev = process.env.NODE_ENV === "development";
  const devEmail = process.env.DEV_LOGIN_EMAIL;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <LoginForm />
          {isDev && devEmail && <DevLoginButton email={devEmail} />}
        </div>
      </div>
    </div>
  );
}
