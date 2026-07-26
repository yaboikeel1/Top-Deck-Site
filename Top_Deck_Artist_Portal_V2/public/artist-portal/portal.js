const ready = window.TOPDECK_SUPABASE_URL && !window.TOPDECK_SUPABASE_URL.includes("YOUR_");
const client = ready ? window.supabase.createClient(window.TOPDECK_SUPABASE_URL, window.TOPDECK_SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);

function setStatus(id, text){ $(id).textContent = text; }

async function refreshSession(){
  if(!client) return;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  $("authCard").classList.toggle("hidden", !!user);
  $("dashboard").classList.toggle("hidden", !user);
  if(user){ await loadProfile(user.id); await loadReleases(user.id); }
}

$("signUpBtn").onclick = async () => {
  if(!client) return setStatus("authStatus","Add your Supabase URL and anon key first.");
  const { error } = await client.auth.signUp({email:$("email").value,password:$("password").value});
  setStatus("authStatus", error ? error.message : "Account created. Check your email if confirmation is enabled.");
};

$("signInBtn").onclick = async () => {
  if(!client) return setStatus("authStatus","Add your Supabase URL and anon key first.");
  const { error } = await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  setStatus("authStatus", error ? error.message : "Signed in.");
  if(!error) refreshSession();
};

$("signOutBtn").onclick = async () => { await client.auth.signOut(); refreshSession(); };

async function loadProfile(userId){
  const { data } = await client.from("artist_profiles").select("*").eq("user_id",userId).maybeSingle();
  if(!data) return;
  $("artistName").value = data.artist_name || "";
  $("bio").value = data.bio || "";
  $("location").value = data.location || "";
  $("profileImage").value = data.profile_image_url || "";
  $("spotify").value = data.spotify_url || "";
  $("appleMusic").value = data.apple_music_url || "";
  $("youtube").value = data.youtube_url || "";
  $("audiomack").value = data.audiomack_url || "";
}

$("saveProfileBtn").onclick = async () => {
  const { data:{user} } = await client.auth.getUser();
  const payload = {
    user_id:user.id,
    artist_name:$("artistName").value,
    bio:$("bio").value,
    location:$("location").value,
    profile_image_url:$("profileImage").value,
    updated_at:new Date().toISOString()
  };
  const { error } = await client.from("artist_profiles").upsert(payload,{onConflict:"user_id"});
  setStatus("profileStatus", error ? error.message : "Profile saved.");
};

$("saveLinksBtn").onclick = async () => {
  const { data:{user} } = await client.auth.getUser();
  const payload = {
    user_id:user.id,
    spotify_url:$("spotify").value,
    apple_music_url:$("appleMusic").value,
    youtube_url:$("youtube").value,
    audiomack_url:$("audiomack").value,
    updated_at:new Date().toISOString()
  };
  const { error } = await client.from("artist_profiles").upsert(payload,{onConflict:"user_id"});
  setStatus("linksStatus", error ? error.message : "Streaming links saved.");
};

$("submitReleaseBtn").onclick = async () => {
  const { data:{user} } = await client.auth.getUser();
  const payload = {
    user_id:user.id,
    title:$("releaseTitle").value,
    release_type:$("releaseType").value,
    release_date:$("releaseDate").value || null,
    featured_artists:$("featuredArtists").value,
    cover_url:$("coverUrl").value,
    audio_url:$("audioUrl").value,
    notes:$("notes").value,
    status:"Pending"
  };
  const { error } = await client.from("release_submissions").insert(payload);
  setStatus("releaseStatus", error ? error.message : "Release submitted for review.");
  if(!error) loadReleases(user.id);
};

async function loadReleases(userId){
  const { data, error } = await client.from("release_submissions").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  if(error) return $("myReleases").textContent = error.message;
  $("myReleases").innerHTML = data.length ? data.map(r=>`
    <div class="release">
      <strong>${escapeHtml(r.title)}</strong> — ${escapeHtml(r.release_type)}
      <div class="small">Status: ${escapeHtml(r.status || "Pending")} ${r.release_date ? "• "+r.release_date : ""}</div>
    </div>`).join("") : "No submissions yet.";
}
function escapeHtml(v=""){ return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }

if(client){
  client.auth.onAuthStateChange(()=>refreshSession());
  refreshSession();
}
