import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-[60vh] flex justify-center items-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-center">
            Sign up for Warrior Wives
          </CardTitle>
          <CardDescription className="text-center">
            Welcome! Please sign up using ID.me
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            {/* TODO: UPDATE THIS TO ID.ME */}
            <Button className="w-full">Sign up with ID.me</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
