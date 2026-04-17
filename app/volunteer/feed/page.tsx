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
    <div className="glass-card" style={{ marginBottom: 20, padding: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#14b8c4,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>
          {post.authorAvatar ? (
            post.authorAvatar.startsWith("http") || post.authorAvatar.startsWith("data:") ? (
              <img src={post.authorAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>{post.authorAvatar}</span>
            )
          ) : "👤"}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#f0f9fa" }}>{post.authorName}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>@{post.authorUsername} • {new Date(post.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#f8fafc", whiteSpace: "pre-wrap", marginBottom: post.imageUrl ? 16 : 0 }}>
        {post.content}
      </p>

      {/* Optional Image */}
      {post.imageUrl && (
        <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16, background: "#060d10", marginTop: 12 }}>
          <img src={post.imageUrl} style={{ width: "100%", maxHeight: 400, objectFit: "cover" }} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 20, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 16 }}>
        <button onClick={handleLike} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, color: isLiked ? "#ef4444" : "#94a3b8", cursor: "pointer", transition: "color 0.2s" }}>
          <span style={{ fontSize: 20 }}>{isLiked ? "❤️" : "🤍"}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{post.likes?.length || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", cursor: "pointer", transition: "color 0.2s" }}>
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{post.commentCount || 0}</span>
        </button>
        <button onClick={() => {
            if (navigator.share) {
                navigator.share({ title: "ResQAI Post", text: post.content, url: window.location.href });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
            }
        }} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", cursor: "pointer", marginLeft: "auto", transition: "color 0.2s" }}>
          <span style={{ fontSize: 20 }}>🔁</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, overflow: "hidden", flexShrink: 0 }}>
                  {c.authorAvatar ? (
                    c.authorAvatar.startsWith("http") || c.authorAvatar.startsWith("data:") ? (
                      <img src={c.authorAvatar} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                      <span>{c.authorAvatar}</span>
                    )
                  ) : "👤"}
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", padding: "10px 14px", borderRadius: "12px 12px 12px 4px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#14b8c4", marginBottom: 4 }}>{c.authorName}</div>
                  <div style={{ fontSize: 14, color: "#f0f9fa", lineHeight: 1.4 }}>{c.content}</div>
                </div>
              </div>
            ))}
            {comments.length === 0 && <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: 10 }}>No comments yet. Be the first!</div>}
          </div>
          
          <div style={{ display: "flex", gap: 10 }}>
            <input 
              value={commentInput} 
              onChange={e => setCommentInput(e.target.value)}
              placeholder="Write a comment..." 
              onKeyDown={(e) => { if(e.key === "Enter") handleComment(); }}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "#f0f9fa", fontSize: 14, outline: "none" }}
            />
            <button onClick={handleComment} disabled={!commentInput.trim()} style={{ background: "linear-gradient(135deg,#14b8c4,#0f6b71)", borderRadius: 20, padding: "0 16px", border: "none", color: "#fff", fontWeight: 600, cursor: commentInput.trim() ? "pointer" : "not-allowed", opacity: commentInput.trim() ? 1 : 0.5 }}>
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
        // Upload file to Firebase Storage
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
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Social Feed</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Share updates, photos, and stories with the volunteer community.</p>
      </div>

      {/* Post Creator */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 30 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#14b8c4,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
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
              style={{ width: "100%", minHeight: 80, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "#f0f9fa", fontSize: 16, outline: "none", resize: "vertical", fontFamily: "inherit" }}
            />
            
            {imagePreview && (
              <div style={{ position: "relative", marginTop: 12, borderRadius: 12, overflow: "hidden" }}>
                <img src={imagePreview} style={{ width: "100%", maxHeight: 300, objectFit: "cover" }} />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#14b8c4", cursor: "pointer", padding: "6px 12px", borderRadius: 20, background: "rgba(20,184,196,0.1)", fontSize: 14, fontWeight: 600 }}>
                <span>📷</span> Photo
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
              
              <button 
                onClick={handlePost} 
                disabled={publishing || (!content.trim() && !imageFile)}
                style={{ padding: "8px 24px", borderRadius: 20, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: (publishing || (!content.trim() && !imageFile)) ? "not-allowed" : "pointer", opacity: (publishing || (!content.trim() && !imageFile)) ? 0.5 : 1 }}
              >
                {publishing ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <div>No posts yet. Be the first to share an update!</div>
          </div>
        ) : (
          posts.map(post => <PostItem key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
