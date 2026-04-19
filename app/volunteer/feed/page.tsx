"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToFeed, createPost, toggleLike, addComment, subscribeToComments, Post, Comment } from "@/lib/social";
import { uploadFile } from "@/lib/storage";

function PostItem({ post }: { post: Post }) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  
  const isLiked = profile ? (post.likes || []).includes(profile.uid) : false;

  useEffect(() => {
    if (showComments) {
      const unsub = subscribeToComments(post.id, setComments);
      return () => unsub();
    }
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!profile) return;
    await toggleLike(post.id, profile.uid, isLiked);
  };

  const handleComment = async () => {
    if (!profile || !commentInput.trim()) return;
    await addComment(post.id, profile, commentInput.trim());
    setCommentInput("");
  };

  return (
    <div className="glass-card fade-up" style={{ marginBottom: "var(--fluid-gap)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", background: "linear-gradient(135deg, var(--teal-500), var(--amber-500))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", overflow: "hidden", flexShrink: 0 }}>
          {post.authorAvatar ? (
            post.authorAvatar.startsWith("http") || post.authorAvatar.startsWith("data:") ? (
              <img src={post.authorAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>{post.authorAvatar}</span>
            )
          ) : "👤"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.authorName}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>@{post.authorUsername} • {new Date(post.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "#f8fafc", whiteSpace: "pre-wrap", marginBottom: post.imageUrl ? "1rem" : 0 }}>
        {post.content}
      </p>

      {/* Optional Image */}
      {post.imageUrl && (
        <div style={{ borderRadius: "12px", overflow: "hidden", background: "var(--bg-dark)", marginTop: "1rem" }}>
          <img src={post.imageUrl} style={{ width: "100%", maxHeight: "max(300px, 40vh)", objectFit: "cover" }} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button onClick={handleLike} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "0.4rem", color: isLiked ? "var(--rose-500)" : "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }}>
          <span style={{ fontSize: "1.25rem" }}>{isLiked ? "❤️" : "🤍"}</span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{post.likes?.length || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }}>
          <span style={{ fontSize: "1.25rem" }}>💬</span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{post.commentCount || 0}</span>
        </button>
        <button onClick={() => {
            if (navigator.share) {
                navigator.share({ title: "ResQAI Post", text: post.content, url: window.location.href });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
            }
        }} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", cursor: "pointer", marginLeft: "auto", transition: "color 0.2s" }}>
          <span style={{ fontSize: "1.25rem" }}>🔁</span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem", maxHeight: "300px", overflowY: "auto" }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: "0.6rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", overflow: "hidden", flexShrink: 0 }}>
                  {c.authorAvatar ? (
                    c.authorAvatar.startsWith("http") || c.authorAvatar.startsWith("data:") ? (
                      <img src={c.authorAvatar} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                      <span>{c.authorAvatar}</span>
                    )
                  ) : "👤"}
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", padding: "0.75rem", borderRadius: "12px 12px 12px 4px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--teal-300)", marginBottom: "0.25rem" }}>{c.authorName}</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.4 }}>{c.content}</div>
                </div>
              </div>
            ))}
            {comments.length === 0 && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem" }}>No comments yet. Be the first!</div>}
          </div>
          
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input 
              value={commentInput} 
              onChange={e => setCommentInput(e.target.value)}
              placeholder="Write a comment..." 
              onKeyDown={(e) => { if(e.key === "Enter") handleComment(); }}
              style={{ flex: 1, padding: "0.6rem 1rem", borderRadius: "1.5rem", fontSize: "0.9rem" }}
            />
            <button onClick={handleComment} disabled={!commentInput.trim()} style={{ background: "linear-gradient(135deg, var(--teal-500), var(--teal-700))", borderRadius: "1.5rem", padding: "0 1.25rem", border: "none", color: "#fff", fontWeight: 600, cursor: commentInput.trim() ? "pointer" : "not-allowed", opacity: commentInput.trim() ? 1 : 0.5, fontSize: "0.85rem" }}>
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const unsub = subscribeToFeed(setPosts);
    return () => unsub();
  }, []);

  const handlePost = async () => {
    if (!profile || (!content.trim() && !imageFile)) return;
    setPublishing(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const path = `posts/${profile.uid}/${Date.now()}_${imageFile.name}`;
        imageUrl = await uploadFile(imageFile, path);
      }
      
      await createPost(profile, content, imageUrl || undefined);
      setContent("");
      setImageFile(null);
      setImagePreview(null);
    } catch (e: any) {
      alert("Failed to create post: " + e.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ width: "min(680px, 100%)", margin: "0 auto", paddingBottom: "2.5rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1>Social Feed</h1>
        <p>Share updates, photos, and stories with the volunteer community.</p>
      </header>

      {/* Post Creator */}
      <div className="glass-card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", background: "linear-gradient(135deg, var(--teal-500), var(--amber-500))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", overflow: "hidden", flexShrink: 0 }}>
            {profile?.avatarUrl ? (
              profile.avatarUrl.startsWith("http") || profile.avatarUrl.startsWith("data:") ? (
                <img src={profile.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span>{profile.avatarUrl}</span>
              )
            ) : "👤"}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's happening?"
              style={{ minHeight: "80px", fontSize: "1rem" }}
            />
            
            {imagePreview && (
              <div style={{ position: "relative", marginTop: "1rem", borderRadius: "12px", overflow: "hidden" }}>
                <img src={imagePreview} style={{ width: "100%", maxHeight: "300px", objectFit: "cover" }} />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", width: "1.75rem", height: "1.75rem", borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--teal-300)", cursor: "pointer", padding: "0.5rem 1rem", borderRadius: "999px", background: "rgba(20,184,196,0.1)", fontSize: "0.9rem", fontWeight: 600 }}>
                <span>📷</span> Photo
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
              
              <button 
                onClick={handlePost} 
                disabled={publishing || (!content.trim() && !imageFile)}
                style={{ padding: "0.6rem 1.5rem", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, var(--teal-500), var(--teal-700))", color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: (publishing || (!content.trim() && !imageFile)) ? "not-allowed" : "pointer", opacity: (publishing || (!content.trim() && !imageFile)) ? 0.5 : 1 }}
              >
                {publishing ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--fluid-gap)" }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem 1rem", border: "1px dashed var(--border)", borderRadius: "1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🌱</div>
            <div>No posts yet. Be the first to share an update!</div>
          </div>
        ) : (
          posts.map(post => <PostItem key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
