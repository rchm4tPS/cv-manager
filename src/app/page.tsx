import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RootPage(props: Props) {
  const searchParams = await props.searchParams;
  
  // Fallback: If Supabase forcefully redirects to the root URL instead of /auth/callback
  // due to missing wildcard configurations in the Supabase Dashboard, we intercept the
  // OAuth code here and forward it to the proper callback route.
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`);
  }
  
  redirect("/home");
}
