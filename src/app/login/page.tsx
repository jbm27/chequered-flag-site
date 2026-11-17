import { redirect } from "next/navigation";

// Old address: staff sign in on the hire desk.
export default function Page() {
  redirect("/manage");
}
