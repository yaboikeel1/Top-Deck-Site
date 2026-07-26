const $ = id => document.getElementById(id);
const configured = window.TOPDECK_SUPABASE_URL && window.TOPDECK_SUPABASE_ANON_KEY;
const supabaseClient = configured
  ? window.supabase.createClient(window.TOPDECK_SUPABASE_URL, window.TOPDECK_SUPABASE_ANON_KEY)
  : null;

function setNotice(id, message, type="") {
  const el = $(id);
  el.textContent = message;
  el.className = `notice ${type}`.trim();
}
function togglePassword(inputId, buttonId) {
  const input = $(inputId);
  const button = $(buttonId);
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  button.textContent = visible ? "Show password" : "Hide password";
}
$("togglePassword").onclick = () => togglePassword("password","togglePassword");
$("toggleNewPassword").onclick = () => togglePassword("newPassword","toggleNewPassword");
$("toggleConfirmPassword").onclick = () => togglePassword("confirmPassword","toggleConfirmPassword");

const redirectUrl = `${location.origin}/artist-portal/`;

$("signInBtn").onclick = async () => {
  if (!supabaseClient) return setNotice("authStatus","Supabase is not configured.","error");
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return setNotice("authStatus","Enter your email and password.","error");
  setNotice("authStatus","Signing in...");
  const { error } = await supabaseClient.auth.signInWithPassword({email,password});
  if (error) return setNotice("authStatus", error.message, "error");
  await refreshSession();
};

$("signUpBtn").onclick = async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 6) return setNotice("authStatus","Use a valid email and a password with at least 6 characters.","error");
  setNotice("authStatus","Creating account...");
  const { data, error } = await supabaseClient.auth.signUp({
    email,password,options:{emailRedirectTo:redirectUrl}
  });
  if (error) return setNotice("authStatus",error.message,"error");
  setNotice("authStatus",data.session ? "Account created and signed in." : "Account created. Check your newest confirmation email.","success");
  await refreshSession();
};

$("forgotBtn").onclick = async () => {
  const email = $("email").value.trim();
  if (!email) return setNotice("authStatus","Enter your email first.","error");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl});
  setNotice("authStatus",error ? error.message : "Password reset email sent. Open the newest message.",error ? "error" : "success");
};

$("savePasswordBtn").onclick = async () => {
  const password = $("newPassword").value;
  const confirmPassword = $("confirmPassword").value;
  if (password.length < 6) return setNotice("resetStatus","Password must have at least 6 characters.","error");
  if (password !== confirmPassword) return setNotice("resetStatus","Passwords do not match.","error");
  const { error } = await supabaseClient.auth.updateUser({password});
  if (error) return setNotice("resetStatus",error.message,"error");
  setNotice("resetStatus","Password updated successfully.","success");
  history.replaceState({},document.title,location.pathname);
  $("resetCard").classList.add("hidden");
  await refreshSession();
};

$("signOutBtn").onclick = async () => {
  await supabaseClient.auth.signOut();
  await refreshSession();
};

async function refreshSession() {
  if (!supabaseClient) {
    setNotice("authStatus","Supabase is not configured.","error");
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;
  $("authCard").classList.toggle("hidden",!!user);
  $("dashboard").classList.toggle("hidden",!user);
  if (user) {
    $("welcomeHeading").textContent = `Welcome, ${user.email}`;
    await loadProfile(user.id);
    await loadReleases(user.id);
  }
}

async function loadProfile(userId) {
  const { data } = await supabaseClient.from("artist_profiles").select("*").eq("user_id",userId).maybeSingle();
  if (!data) return;
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
  const { data:{user} } = await supabaseClient.auth.getUser();
  const payload = {
    user_id:user.id,
    artist_name:$("artistName").value.trim(),
    bio:$("bio").value.trim(),
    location:$("location").value.trim(),
    profile_image_url:$("profileImage").value.trim(),
    updated_at:new Date().toISOString()
  };
  const { error } = await supabaseClient.from("artist_profiles").upsert(payload,{onConflict:"user_id"});
  setNotice("profileStatus",error ? error.message : "Profile saved.",error ? "error" : "success");
};

$("saveLinksBtn").onclick = async () => {
  const { data:{user} } = await supabaseClient.auth.getUser();
  const payload = {
    user_id:user.id,
    spotify_url:$("spotify").value.trim(),
    apple_music_url:$("appleMusic").value.trim(),
    youtube_url:$("youtube").value.trim(),
    audiomack_url:$("audiomack").value.trim(),
    updated_at:new Date().toISOString()
  };
  const { error } = await supabaseClient.from("artist_profiles").upsert(payload,{onConflict:"user_id"});
  setNotice("linksStatus",error ? error.message : "Streaming links saved.",error ? "error" : "success");
};

async function uploadFile(bucket,file,userId,prefix) {
  if (!file) return null;
  const clean = file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path = `${userId}/${Date.now()}-${prefix}-${clean}`;
  const { error } = await supabaseClient.storage.from(bucket).upload(path,file,{upsert:false});
  if (error) throw error;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

$("submitReleaseBtn").onclick = async () => {
  const title = $("releaseTitle").value.trim();
  if (!title) return setNotice("releaseStatus","Enter a release title.","error");
  const { data:{user} } = await supabaseClient.auth.getUser();
  try {
    setNotice("releaseStatus","Uploading files and submitting...");
    const coverUrl = await uploadFile("cover-art",$("coverFile").files[0],user.id,"cover");
    const audioUrl = await uploadFile("artist-audio",$("audioFile").files[0],user.id,"audio");
    const payload = {
      user_id:user.id,
      title,
      release_type:$("releaseType").value,
      release_date:$("releaseDate").value || null,
      featured_artists:$("featuredArtists").value.trim(),
      cover_url:coverUrl,
      audio_url:audioUrl,
      notes:$("notes").value.trim(),
      status:"Pending"
    };
    const { error } = await supabaseClient.from("release_submissions").insert(payload);
    if (error) throw error;
    setNotice("releaseStatus","Release submitted for review.","success");
    await loadReleases(user.id);
  } catch (error) {
    setNotice("releaseStatus",error.message,"error");
  }
};

async function loadReleases(userId) {
  const { data,error } = await supabaseClient.from("release_submissions").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  if (error) {
    $("myReleases").textContent = error.message;
    return;
  }
  $("myReleases").innerHTML = data.length ? data.map(r => `
    <div class="release-card">
      <strong>${escapeHtml(r.title)}</strong>
      <span class="status-pill">${escapeHtml(r.status || "Pending")}</span>
      <div class="small">${escapeHtml(r.release_type)}${r.release_date ? " • " + escapeHtml(r.release_date) : ""}</div>
      ${r.admin_notes ? `<div class="small">Admin note: ${escapeHtml(r.admin_notes)}</div>` : ""}
    </div>`).join("") : "No submissions yet.";
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

async function init() {
  if (!supabaseClient) return setNotice("authStatus","Supabase is not configured.","error");
  supabaseClient.auth.onAuthStateChange((event)=>{
    if (event === "PASSWORD_RECOVERY") {
      $("authCard").classList.add("hidden");
      $("dashboard").classList.add("hidden");
      $("resetCard").classList.remove("hidden");
    } else {
      refreshSession();
    }
  });
  await refreshSession();
}
init();
