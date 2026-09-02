import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/today");
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : "/today";

  return (
    <main className="login-page">
      <section className="login-principle">
        <div className="brand login-brand">
          <span className="brand-mark">W</span>
          <span>Weekly System</span>
        </div>
        <div>
          <p className="section-kicker">Спокойная система недели</p>
          <h1>Нагрузка следует за ресурсом.</h1>
          <p>
            Три режима. Три опоры. Ни одного проигранного дня из-за завышенного
            плана.
          </p>
        </div>
        <p className="login-quote">Минимум — тоже полноценный успех.</p>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <p className="eyebrow">Личное пространство</p>
          <h2>С возвращением</h2>
          <p className="login-copy">
            Войдите, чтобы продолжить сегодняшний ритм.
          </p>
          <LoginForm returnTo={returnTo} />
        </div>
      </section>
    </main>
  );
}
