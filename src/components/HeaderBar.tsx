"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut, User } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onReset?: () => void;
}

export function Header({ onReset }: HeaderProps) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onReset) {
      onReset();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <header className="sm:fixed sm:top-0 sm:right-0 sm:left-0 sm:z-50 w-full border-b bg-background backdrop-blur-sm">
        <div className="mx-auto w-full max-w-4xl px-8 pt-3 pb-2 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            {/* Title Section */}
            <Link href="/" onClick={handleClick} className="group">
              <div className="flex flex-col lg:flex-row lg:items-baseline lg:gap-x-2">
                <h1 className="cursor-pointer text-4xl leading-tight tracking-tight text-foreground group-hover:text-un-blue">
                  <span className="leading-none font-bold">UN80 Initiative</span>
                </h1>

                <div className="flex items-baseline gap-x-1">
                  <h1 className="cursor-pointer text-3xl leading-tight font-normal text-foreground group-hover:text-un-blue lg:text-4xl">
                    Actions
                  </h1>

                  {/* Beta Badge - visible on all screen sizes, inline with Actions */}
                  <div className="self-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="inline-flex h-auto cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-700"
                        >
                          beta
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-56">
                        <p className="text-sm">
                          This dashboard is currently in its beta version and will
                          be updated on a regular basis.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Link>

            {/* Login/User Menu */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user?.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          Logged in
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsLoginDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <LoginDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
      />
    </>
  );
}
