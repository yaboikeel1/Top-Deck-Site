const ADMIN_EMAILS = ["YOUR_ADMIN_EMAIL@example.com"];
const ready = window.TOPDECK_SUPABASE_URL && !window.TOPDECK_SUPABASE_URL.includes("YOUR_");
const client = ready ? window.supabase.createClient(window.TOPDECK_SUPABASE_URL, window.TOPDECK_SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
const safe = v => String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

$("loginBtn").onclick = async () => {
  if(!client) return $("status").textContent = "Add your Supabase credentials first.";
  const { data, error } = await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  if(error) return $("status").textContent = error.message;
  if(!ADMIN_EMAILS.includes(data.user.email)){
    await client.auth.signOut();
    return $("status").textContent = "This account is not listed as an admin.";
  }
  showDashboard(data.user.email);
};
$("logoutBtn").onclick = async()=>{await client.auth.signOut(); location.reload();};

async function showDashboard(email){
  $("status").textContent = `Signed in as ${email}`;
  $("adminDashboard").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  await loadQueue();
}
async function loadQueue(){
  const { data, error } = await client.from("release_submissions").select("*").order("created_at",{ascending:false});
  if(error) return $("queue").textContent = error.message;
  $("queue").innerHTML = data.length ? data.map(r=>`
    <div class="release">
      <strong>${safe(r.title)}</strong> — ${safe(r.release_type)}
      <div class="small">Current status: ${safe(r.status)}</div>
      <div class="small">${safe(r.notes)}</div>
      <div class="row" style="margin-top:10px">
        <button class="primary" onclick="updateStatus('${r.id}','Approved')">Approve</button>
        <button class="danger" onclick="updateStatus('${r.id}','Rejected')">Reject</button>
        <button class="secondary" onclick="updateStatus('${r.id}','Needs Changes')">Needs Changes</button>
      </div>
    </div>`).join("") : "No release submissions found.";
}
async function updateStatus(id,status){
  const { error } = await client.from("release_submissions").update({status}).eq("id",id);
  if(error) alert(error.message); else loadQueue();
}

if(client){
  client.auth.getSession().then(({data})=>{
    const user=data.session?.user;
    if(user && ADMIN_EMAILS.includes(user.email)) showDashboard(user.email);
  });
}
