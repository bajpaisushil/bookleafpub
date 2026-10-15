import { AuthorShell } from "@/components/author-shell";

export default function AuthorLayout({ children }: LayoutProps<"/author">) {
  return <AuthorShell>{children}</AuthorShell>;
}
