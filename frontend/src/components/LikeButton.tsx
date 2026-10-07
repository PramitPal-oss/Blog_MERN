import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postsApi, commentsApi } from "../api";
import { apiMessage } from "../api/client";

export interface LikeButtonProps {
  id: string;
  type: "post" | "comment";
  initialLikeCount?: number;
  initialLikedByMe?: boolean;
  className?: string;
  showCount?: boolean;
}

export function LikeButton({ id, type, initialLikeCount = 0, initialLikedByMe = false, className, showCount = true }: LikeButtonProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (auth.status !== "authenticated") {
      navigate("/login");
      return;
    }

    setIsPending(true);
    try {
      const api = type === "post" ? postsApi : commentsApi;
      const response = likedByMe ? await api.unlike(id) : await api.like(id);
      
      setLikeCount(response.data.data.likeCount);
      setLikedByMe(response.data.data.likedByMe);
    } catch (err) {
      console.error("Failed to toggle like:", apiMessage(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-1.5 h-8 px-2 text-muted-foreground hover:text-foreground ${likedByMe ? "text-destructive hover:text-destructive" : ""} ${className}`}
      onClick={handleToggle}
      disabled={isPending}
    >
      <Heart className={`h-4 w-4 ${likedByMe ? "fill-current text-destructive" : ""}`} />
      {showCount && <span className="text-xs font-medium">{likeCount}</span>}
    </Button>
  );
}
