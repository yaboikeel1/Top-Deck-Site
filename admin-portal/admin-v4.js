const $ = id => document.getElementById(id);
const client = window.supabase.createClient(window.TOPDECK_SUPABASE_URL,window.TOPDECK_SUPABASE_ANON_KEY);

function setNotice(id,message,type=""){const el=$(id);el.textContent=message;el.className=`notice ${type}`.trim();}
$("togglePassword").onclick=()=>{
  const input=$("password"),button=$("togglePassword");
  const visible=input.type==="text";input.type=visible?"password":"text";button.textContent=visible?"Show password":"Hide password";
};

$("loginBtn").onclick=async()=>{
  const email=$("email").value.trim(),password=$("password").value;
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error)return setNotice("loginStatus",error.message,"error");
  await verifyAdmin();
};
$("signOutBtn").onclick=async()=>{await client.auth.signOut();location.reload();};

async function verifyAdmin(){
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;
  const {data,error}=await client.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
  if(error||!data){
    await client.auth.signOut();
    return setNotice("loginStatus","This account does not have admin access.","error");
  }
  $("adminLogin").classList.add("hidden");
  $("adminDashboard").classList.remove("hidden");
  await loadDashboard();
}

async function loadDashboard(){
  const [{data:artists},{data:releases,error}] = await Promise.all([
    client.from("artist_profiles").select("user_id,artist_name"),
    client.from("release_submissions").select("*").order("created_at",{ascending:false})
  ]);
  if(error)return setNotice("adminStatus",error.message,"error");
  const artistMap=Object.fromEntries((artists||[]).map(a=>[a.user_id,a.artist_name||a.user_id]));
  $("artistCount").textContent=(artists||[]).length;
  $("releaseCount").textContent=(releases||[]).length;
  $("pendingCount").textContent=(releases||[]).filter(r=>r.status==="Pending").length;
  $("releaseRows").innerHTML=(releases||[]).map(r=>`
    <tr>
      <td>${escapeHtml(artistMap[r.user_id]||r.user_id)}</td>
      <td><strong>${escapeHtml(r.title)}</strong><div class="small">${escapeHtml(r.release_type||"")}</div></td>
      <td>${r.cover_url?`<a href="${r.cover_url}" target="_blank">Cover</a>`:"—"} / ${r.audio_url?`<a href="${r.audio_url}" target="_blank">Audio</a>`:"—"}</td>
      <td>
        <select id="status-${r.id}">
          ${["Pending","Approved","Needs Changes","Rejected"].map(s=>`<option ${r.status===s?"selected":""}>${s}</option>`).join("")}
        </select>
      </td>
      <td><input id="note-${r.id}" value="${escapeAttr(r.admin_notes||"")}" placeholder="Optional note"></td>
      <td><button class="primary" onclick="saveRelease('${r.id}')">Save</button></td>
    </tr>`).join("");
  setNotice("adminStatus","Dashboard loaded.","success");
}

window.saveRelease=async(id)=>{
  const statusValue=$(`status-${id}`).value;
  const note=$(`note-${id}`).value;
  const {error}=await client.from("release_submissions").update({status:statusValue,admin_notes:note,updated_at:new Date().toISOString()}).eq("id",id);
  setNotice("adminStatus",error?error.message:"Release updated.",error?"error":"success");
  if(!error)await loadDashboard();
};

function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function escapeAttr(value=""){return escapeHtml(value).replace(/`/g,"&#096;");}

client.auth.onAuthStateChange(()=>verifyAdmin());
verifyAdmin();
