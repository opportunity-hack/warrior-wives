"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Cross2Icon } from "@radix-ui/react-icons";
import { InterestsType } from "@/app/api/interests/route";
import { UserDataType } from "@/app/api/user/route";
import useSWRMutation from "swr/mutation";
import { apiClient } from "@/apiClient";
import { Spinner } from "@chakra-ui/react";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(40, {
      message: "Name must not be longer than 40 characters.",
    }),
  email: z
    .string({
      required_error: "Please select an email to display.",
    })
    .email(),
  branch: z.string({
    required_error: "Please select a branch of service.",
  }),
  interests: z
    .array(
      z.object({
        id: z.number({
          required_error: "Please select an interest",
        }),
        value: z
          .string({ required_error: "Please select an interest" })
          .min(1, {
            message: "Please select an interest",
          }),
      })
    )
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

async function updateUser(url: string, { arg }: { arg: ProfileFormValues }) {
  await apiClient(url, {
    method: "PUT",
    body: JSON.stringify(arg),
  });
}

export default function ProfileForm({
  user,
  interests,
}: {
  user: UserDataType;
  interests: InterestsType;
}) {
  const { toast } = useToast();
  const { trigger, isMutating } = useSWRMutation("/user", updateUser, {
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with your request.",
      });
    },
  });

  const availableInterests = interests
    .map((interest) => ({
      id: interest.id,
      value: interest.name,
      label: interest.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const { name, email, branch, interests: userInterests } = user;

  const defaultValues: Partial<ProfileFormValues> = {
    name: name || "",
    branch,
    email: email || "",
    interests:
      userInterests
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((interest) => ({
          id: interest.id,
          value: interest.name,
        })) || [],
  };
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    name: "interests",
    control: form.control,
  });

  function removeDuplicatedInterests() {
    const uniqueInterests = new Set();
    const indexesToRemove: number[] = [];

    const fieldsCopy = [...fields];
    fieldsCopy.forEach((field, index) => {
      if (uniqueInterests.has(field.value)) {
        indexesToRemove.push(index);
      } else {
        uniqueInterests.add(field.value);
      }
    });

    remove(indexesToRemove);
  }

  function onSubmit(data: ProfileFormValues) {
    removeDuplicatedInterests();
    trigger(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} className="bg-white" />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="example@google.com"
                  {...field}
                  disabled
                  className="bg-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="branch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch of Service</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a branch of service" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Army">Army</SelectItem>
                  <SelectItem value="Navy">Navy</SelectItem>
                  <SelectItem value="Air Force">Air Force</SelectItem>
                  <SelectItem value="Marines">Marines</SelectItem>
                  <SelectItem value="Coast Guard">Coast Guard</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The branch of service that you or your family member served in.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`interests.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && "sr-only")}>
                    Interests
                  </FormLabel>
                  <FormDescription className={cn(index !== 0 && "sr-only")}>
                    Select any of these available interests. More interests will
                    be added when more groups are created.
                  </FormDescription>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? availableInterests.find(
                                  (interest) => interest.value === field.value
                                )?.label
                              : "Select interest"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="ml-2 p-2"
                            onClick={() => {
                              remove(index);
                            }}
                          >
                            <Cross2Icon />
                          </Button>
                        </div>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search interest..."
                          className="h-9"
                        />
                        <CommandEmpty>No interests found.</CommandEmpty>
                        <CommandGroup>
                          <CommandList>
                            {availableInterests.map((interest) => (
                              <CommandItem
                                value={interest.label}
                                key={interest.value}
                                onSelect={() => {
                                  form.setValue(
                                    `interests.${index}.value`,
                                    interest.value
                                  );
                                  form.setValue(
                                    `interests.${index}.id`,
                                    interest.id
                                  );
                                }}
                              >
                                {interest.label}
                                <CheckIcon
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    interest.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ id: 0, value: "" })}
          >
            Add Interest
          </Button>
        </div>
        <Button type="submit" className="w-24" disabled={isMutating}>
          {isMutating ? <Spinner size="sm" /> : "Update"}
        </Button>
      </form>
    </Form>
  );
}
