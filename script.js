
const SUPABASE_URL = "https://lsaydedtuagmnkwdwvtm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_hHpwbA-COIC8MJ1TFUhQ0g_tYVl7ZUn";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// =========================
// GLOBAL VARIABLES
// =========================

let currentUser = null;
let currentWatchVideo = null;
let watchPage = null;

// =========================
// HELPERS
// =========================

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

async function getCurrentUser() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    currentUser = user;
    return user;
}

// =========================
// ACCOUNT
// =========================

async function updateAuthUI() {
    const user = await getCurrentUser();

    const profileButton =
        document.getElementById("profileButton");

    if (profileButton) {
        profileButton.textContent =
            user ? "Profile" : "Login";
    }
}

async function signup(username, email, password) {
    const { data, error } =
        await supabaseClient.auth.signUp({
            email,
            password
        });

    if (error) {
        showToast(error.message);
        return;
    }

    if (data.user) {
        const { error: profileError } =
            await supabaseClient
                .from("profiles")
                .upsert({
                    id: data.user.id,
                    username,
                    bio: "",
                    avatar_url: null
                });

        if (profileError) {
            console.error(profileError);
        }

        showToast("Account created! 🎉");
    }
}

async function login(email, password) {
    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        showToast(error.message);
        return;
    }

    showToast("Logged in! 🔥");

    await updateAuthUI();

    const overlay =
        document.getElementById("accountOverlay");

    if (overlay) {
        overlay.style.display = "none";
    }
}

async function logout() {
    await supabaseClient.auth.signOut();

    currentUser = null;

    showToast("Logged out.");

    await updateAuthUI();
}

// =========================
// PROFILE
// =========================

async function openProfile() {
    const user = await getCurrentUser();

    if (!user) {
        const overlay =
            document.getElementById("accountOverlay");

        if (overlay) {
            overlay.style.display = "flex";
        }

        return;
    }

    const { data: profile } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

    const overlay =
        document.getElementById("profileOverlay");

    if (!overlay) return;

    overlay.style.display = "flex";

    const username =
        document.getElementById("profileUsername");

    const bio =
        document.getElementById("profileBio");

    const avatar =
        document.getElementById("profileAvatar");

    const preview =
        document.getElementById("profilePreview");

    if (username) {
        username.value =
            profile?.username || "";
    }

    if (bio) {
        bio.value =
            profile?.bio || "";
    }

    if (avatar) {
        avatar.value =
            profile?.avatar_url || "";
    }

    if (preview) {
        if (profile?.avatar_url) {
            preview.innerHTML = "";

            const image =
                document.createElement("img");

            image.src = profile.avatar_url;

            image.style.cssText = `
                width:100%;
                height:100%;
                border-radius:50%;
                object-fit:cover;
            `;

            preview.appendChild(image);
        } else {
            preview.textContent = "👤";
        }
    }
}

async function saveProfile() {
    const user = await getCurrentUser();

    if (!user) {
        showToast("Please log in first.");
        return;
    }

    const username =
        document
            .getElementById("profileUsername")
            ?.value.trim() || "";

    const bio =
        document
            .getElementById("profileBio")
            ?.value.trim() || "";

    const avatar_url =
        document
            .getElementById("profileAvatar")
            ?.value.trim() || null;

    const { error } =
        await supabaseClient
            .from("profiles")
            .upsert({
                id: user.id,
                username,
                bio,
                avatar_url
            });

    if (error) {
        showToast(error.message);
        return;
    }

    showToast("Profile saved! 🔥");

    const overlay =
        document.getElementById("profileOverlay");

    if (overlay) {
        overlay.style.display = "none";
    }

    await updateAuthUI();
}

// =========================
// WATCH PAGE
// =========================

function createWatchPage() {
    if (watchPage) {
        return;
    }

    watchPage =
        document.createElement("div");

    watchPage.id = "watchPage";

    watchPage.style.cssText = `
        display:none;
        position:fixed;
        inset:0;
        z-index:999999;
        overflow-y:auto;
        background:#09090d;
        color:white;
        padding:25px;
        box-sizing:border-box;
    `;

    watchPage.innerHTML = `
        <div style="
            max-width:1100px;
            margin:auto;
        ">

            <button
                id="watchBackButton"
                type="button"
                style="
                    background:#222;
                    color:white;
                    border:none;
                    padding:12px 18px;
                    border-radius:10px;
                    cursor:pointer;
                    margin-bottom:20px;
                    font-size:15px;
                "
            >
                ← Back
            </button>

            <video
                id="watchVideo"
                controls
                playsinline
                style="
                    width:100%;
                    max-height:650px;
                    background:#000;
                    border-radius:14px;
                    display:block;
                "
            ></video>

            <h1
                id="watchTitle"
                style="
                    margin-top:20px;
                    margin-bottom:8px;
                    font-size:28px;
                "
            ></h1>

            <div
                id="watchCreator"
                style="
                    margin-bottom:15px;
                    color:#bbb;
                    display:flex;
                    align-items:center;
                "
            ></div>

            <div
                id="watchDescription"
                style="
                    background:#15151b;
                    padding:18px;
                    border-radius:12px;
                    white-space:pre-wrap;
                    margin-bottom:30px;
                "
            ></div>

            <h2>💬 Comments</h2>

            <div
                id="commentLoginMessage"
                style="
                    color:#aaa;
                    margin-bottom:15px;
                "
            ></div>

            <div style="
                display:flex;
                gap:10px;
                margin-bottom:25px;
            ">

                <input
                    id="commentInput"
                    type="text"
                    maxlength="500"
                    placeholder="Write a comment..."
                    style="
                        flex:1;
                        padding:14px;
                        border-radius:10px;
                        border:1px solid #333;
                        background:#15151b;
                        color:white;
                        outline:none;
                        font-size:15px;
                    "
                >

                <button
                    id="postComment"
                    type="button"
                    style="
                        padding:14px 20px;
                        border:none;
                        border-radius:10px;
                        background:#5865f2;
                        color:white;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    Post
                </button>

            </div>

            <div id="commentsList"></div>

        </div>
    `;

    document.body.appendChild(watchPage);

    document
        .getElementById("watchBackButton")
        ?.addEventListener(
            "click",
            closeWatchPage
        );

    document
        .getElementById("postComment")
        ?.addEventListener(
            "click",
            postNewComment
        );

    document
        .getElementById("commentInput")
        ?.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    postNewComment();
                }
            }
        );
}

async function openWatchPage(video) {
    createWatchPage();

    currentWatchVideo = video;

    const watchVideo =
        document.getElementById("watchVideo");

    const watchTitle =
        document.getElementById("watchTitle");

    const watchDescription =
        document.getElementById("watchDescription");

    const watchCreator =
        document.getElementById("watchCreator");

    const commentInput =
        document.getElementById("commentInput");

    if (watchVideo) {
        watchVideo.src =
            video.video_url;

        watchVideo.load();
    }

    if (watchTitle) {
        watchTitle.textContent =
            video.title ||
            "Untitled video";
    }

    if (watchDescription) {
        watchDescription.textContent =
            video.description ||
            "No description.";
    }

    if (commentInput) {
        commentInput.value = "";
    }

    if (watchCreator) {
        watchCreator.textContent =
            "Loading creator...";
    }

    const homepage =
        document.querySelector(".content");

    if (homepage) {
        homepage.style.display = "none";
    }

    watchPage.style.display = "block";

    await loadCreator(video.user_id);

    await loadComments(video.id);

    await getCurrentUser();

    updateCommentUI();
}

function closeWatchPage() {
    const video =
        document.getElementById("watchVideo");

    if (video) {
        video.pause();
        video.src = "";
        video.load();
    }

    if (watchPage) {
        watchPage.style.display = "none";
    }

    const homepage =
        document.querySelector(".content");

    if (homepage) {
        homepage.style.display = "";
    }

    currentWatchVideo = null;
}

// =========================
// CREATOR
// =========================

async function loadCreator(userId) {
    const creator =
        document.getElementById("watchCreator");

    if (!creator) return;

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", userId)
            .maybeSingle();

    if (error || !data) {
        creator.textContent =
            "Unknown creator";
        return;
    }

    creator.innerHTML = "";

    const avatar =
        document.createElement("img");

    avatar.src =
        data.avatar_url ||
        "https://placehold.co/40x40?text=V";

    avatar.style.width = "40px";
    avatar.style.height = "40px";
    avatar.style.borderRadius = "50%";
    avatar.style.objectFit = "cover";
    avatar.style.marginRight = "10px";

    const name =
        document.createElement("span");

    name.textContent =
        data.username ||
        "Vibely user";

    creator.appendChild(avatar);
    creator.appendChild(name);
}

// =========================
// COMMENTS
// =========================

function updateCommentUI() {
    const message =
        document.getElementById(
            "commentLoginMessage"
        );

    const input =
        document.getElementById(
            "commentInput"
        );

    const button =
        document.getElementById(
            "postComment"
        );

    if (!message || !input || !button) {
        return;
    }

    if (currentUser) {
        message.textContent = "";

        input.disabled = false;

        button.disabled = false;

        button.style.opacity = "1";
    } else {
        message.textContent =
            "Log in to leave a comment.";

        input.disabled = true;

        button.disabled = true;

        button.style.opacity = "0.5";
    }
}

async function loadComments(videoId) {
    const list =
        document.getElementById(
            "commentsList"
        );

    if (!list) return;

    list.innerHTML = `
        <div style="color:#aaa;">
            Loading comments...
        </div>
    `;

    const { data, error } =
        await supabaseClient
            .from("comments")
            .select("*")
            .eq("video_id", videoId)
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(
            "Load comments error:",
            error
        );

        list.innerHTML = `
            <div style="color:#aaa;">
                Could not load comments.
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = `
            <div style="color:#777;">
                No comments yet. Be the first! 👀
            </div>
        `;

        return;
    }

    list.innerHTML = "";

    for (const comment of data) {
        const commentBox =
            document.createElement("div");

        commentBox.style.cssText = `
            background:#15151b;
            padding:15px;
            border-radius:12px;
            margin-bottom:10px;
        `;

        const commentText =
            document.createElement("div");

        commentText.textContent =
            comment.content;

        commentText.style.cssText = `
            font-size:15px;
            line-height:1.5;
        `;

        const date =
            document.createElement("div");

        date.textContent =
            comment.created_at
                ? new Date(
                    comment.created_at
                ).toLocaleString()
                : "";

        date.style.cssText = `
            color:#777;
            font-size:12px;
            margin-top:7px;
        `;

        commentBox.appendChild(
            commentText
        );

        commentBox.appendChild(date);

        list.appendChild(
            commentBox
        );
    }
}

async function postNewComment() {
    console.log(
        "POST COMMENT BUTTON PRESSED"
    );

    const user =
        await getCurrentUser();

    if (!user) {
        showToast(
            "Please log in to comment."
        );
        return;
    }

    if (!currentWatchVideo) {
        showToast(
            "No video is open."
        );
        return;
    }

    const input =
        document.getElementById(
            "commentInput"
        );

    const button =
        document.getElementById(
            "postComment"
        );

    if (!input) {
        showToast(
            "Comment box not found."
        );
        return;
    }

    const content =
        input.value.trim();

    if (!content) {
        showToast(
            "Write a comment first."
        );

        input.focus();

        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent =
            "Posting...";
    }

    const { data, error } =
        await supabaseClient
            .from("comments")
            .insert({
                video_id:
                    currentWatchVideo.id,
                user_id:
                    user.id,
                content
            })
            .select()
            .single();

    if (error) {
        console.error(
            "COMMENT ERROR:",
            error
        );

        showToast(
            "Comment failed: " +
            error.message
        );

        if (button) {
            button.disabled = false;
            button.textContent =
                "Post";
        }

        return;
    }

    console.log(
        "COMMENT SUCCESS:",
        data
    );

    input.value = "";

    showToast(
        "Comment posted! 🔥"
    );

    await loadComments(
        currentWatchVideo.id
    );

    if (button) {
        button.disabled = false;
        button.textContent =
            "Post";
    }
}

// =========================
// LOAD VIDEOS
// =========================

async function loadVideos() {
    const grid =
        document.getElementById(
            "videoGrid"
        );

    if (!grid) return;

    const { data, error } =
        await supabaseClient
            .from("videos")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(
            "Video loading error:",
            error
        );
        return;
    }

    if (!data || data.length === 0) {
        return;
    }

    grid.innerHTML = "";

    for (const video of data) {
        const card =
            document.createElement("div");

        card.className =
            "video-card";

        card.style.cursor =
            "pointer";

        const thumbnail =
            document.createElement("div");

        thumbnail.className =
            "thumbnail";

        if (video.thumbnail_url) {
            thumbnail.style.backgroundImage =
                `url("${video.thumbnail_url}")`;

            thumbnail.style.backgroundSize =
                "cover";

            thumbnail.style.backgroundPosition =
                "center";
        } else {
            thumbnail.style.background =
                "linear-gradient(135deg,#5865f2,#9b59b6)";
        }

        const info =
            document.createElement("div");

        info.className =
            "video-info";

        info.innerHTML = `
            <div style="font-weight:bold;">
                ${escapeHTML(
                    video.title ||
                    "Untitled"
                )}
            </div>

            <div style="
                color:#888;
                font-size:13px;
                margin-top:5px;
            ">
                Click to watch
            </div>
        `;

        card.appendChild(
            thumbnail
        );

        card.appendChild(
            info
        );

        card.addEventListener(
            "click",
            () => openWatchPage(video)
        );

        grid.appendChild(card);
    }
}

// =========================
// HTML SAFETY
// =========================

function escapeHTML(text) {
    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

// =========================
// UPLOAD
// =========================

async function uploadVideo() {
    const user =
        await getCurrentUser();

    if (!user) {
        showToast(
            "Please log in before uploading."
        );
        return;
    }

    const videoFile =
        document.getElementById(
            "videoFile"
        )?.files?.[0];

    const thumbnailFile =
        document.getElementById(
            "thumbnailFile"
        )?.files?.[0];

    const title =
        document.getElementById(
            "videoTitle"
        )?.value.trim();

    const description =
        document.getElementById(
            "videoDescription"
        )?.value.trim() || "";

    const status =
        document.getElementById(
            "uploadStatus"
        );

    if (!videoFile) {
        showToast(
            "Choose a video first."
        );
        return;
    }

    if (!title) {
        showToast(
            "Enter a video title."
        );
        return;
    }

    if (status) {
        status.textContent =
            "Uploading...";
    }

    const videoPath =
        `${user.id}/${Date.now()}-${videoFile.name}`;

    const videoUpload =
        await supabaseClient.storage
            .from("videos")
            .upload(
                videoPath,
                videoFile
            );

    if (videoUpload.error) {
        console.error(
            videoUpload.error
        );

        showToast(
            "Video upload failed: " +
            videoUpload.error.message
        );

        return;
    }

    const {
        data: videoPublic
    } =
        supabaseClient.storage
            .from("videos")
            .getPublicUrl(
                videoPath
            );

    let thumbnailUrl = null;

    if (thumbnailFile) {
        const thumbnailPath =
            `${user.id}/${Date.now()}-${thumbnailFile.name}`;

        const thumbnailUpload =
            await supabaseClient.storage
                .from("thumbnails")
                .upload(
                    thumbnailPath,
                    thumbnailFile
                );

        if (!thumbnailUpload.error) {
            const {
                data: thumbnailPublic
            } =
                supabaseClient.storage
                    .from("thumbnails")
                    .getPublicUrl(
                        thumbnailPath
                    );

            thumbnailUrl =
                thumbnailPublic.publicUrl;
        }
    }

    const { error } =
        await supabaseClient
            .from("videos")
            .insert({
                user_id: user.id,
                title,
                description,
                video_url:
                    videoPublic.publicUrl,
                thumbnail_url:
                    thumbnailUrl,
                comments_enabled: true
            });

    if (error) {
        console.error(error);

        showToast(
            "Database error: " +
            error.message
        );

        return;
    }

    if (status) {
        status.textContent =
            "Upload successful! 🔥";
    }

    showToast(
        "Video uploaded! 🔥"
    );

    const overlay =
        document.getElementById(
            "uploadOverlay"
        );

    if (overlay) {
        overlay.style.display =
            "none";
    }

    await loadVideos();
}

// =========================
// SEARCH
// =========================

async function searchVideos() {
    const input =
        document.getElementById(
            "searchInput"
        );

    const grid =
        document.getElementById(
            "videoGrid"
        );

    if (!input || !grid) return;

    const query =
        input.value.trim();

    if (!query) {
        await loadVideos();
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("videos")
            .select("*")
            .ilike(
                "title",
                `%${query}%`
            )
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(error);

        showToast(
            "Search failed."
        );

        return;
    }

    grid.innerHTML = "";

    if (!data || data.length === 0) {
        grid.innerHTML = `
            <p style="color:#888;">
                No videos found.
            </p>
        `;

        return;
    }

    for (const video of data) {
        const card =
            document.createElement("div");

        card.className =
            "video-card";

        card.style.cursor =
            "pointer";

        const thumbnail =
            document.createElement("div");

        thumbnail.className =
            "thumbnail";

        if (video.thumbnail_url) {
            thumbnail.style.backgroundImage =
                `url("${video.thumbnail_url}")`;

            thumbnail.style.backgroundSize =
                "cover";

            thumbnail.style.backgroundPosition =
                "center";
        }

        const info =
            document.createElement("div");

        info.className =
            "video-info";

        info.innerHTML = `
            <div style="font-weight:bold;">
                ${escapeHTML(
                    video.title ||
                    "Untitled"
                )}
            </div>

            <div style="
                color:#888;
                font-size:13px;
                margin-top:5px;
            ">
                Click to watch
            </div>
        `;

        card.appendChild(
            thumbnail
        );

        card.appendChild(
            info
        );

        card.addEventListener(
            "click",
            () => openWatchPage(video)
        );

        grid.appendChild(card);
    }
}

// =========================
// STARTUP
// =========================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        createWatchPage();

        await getCurrentUser();

        await updateAuthUI();

        await loadVideos();

        // PROFILE

        document
            .getElementById("profileButton")
            ?.addEventListener(
                "click",
                openProfile
            );

        document
            .getElementById("saveProfile")
            ?.addEventListener(
                "click",
                saveProfile
            );

        document
            .getElementById("closeProfile")
            ?.addEventListener(
                "click",
                () => {
                    const overlay =
                        document.getElementById(
                            "profileOverlay"
                        );

                    if (overlay) {
                        overlay.style.display =
                            "none";
                    }
                }
            );

        // UPLOAD

        document
            .getElementById(
                "uploadVideoButton"
            )
            ?.addEventListener(
                "click",
                uploadVideo
            );

        document
            .getElementById(
                "uploadButton"
            )
            ?.addEventListener(
                "click",
                async () => {

                    const user =
                        await getCurrentUser();

                    if (!user) {
                        showToast(
                            "Please log in before uploading."
                        );
                        return;
                    }

                    const overlay =
                        document.getElementById(
                            "uploadOverlay"
                        );

                    if (overlay) {
                        overlay.style.display =
                            "flex";
                    }
                }
            );

        document
            .getElementById("closeUpload")
            ?.addEventListener(
                "click",
                () => {
                    const overlay =
                        document.getElementById(
                            "uploadOverlay"
                        );

                    if (overlay) {
                        overlay.style.display =
                            "none";
                    }
                }
            );

        document
            .getElementById("videoFile")
            ?.addEventListener(
                "change",
                event => {

                    const file =
                        event.target.files[0];

                    const text =
                        document.getElementById(
                            "selectedVideo"
                        );

                    if (text) {
                        text.textContent =
                            file
                                ? file.name
                                : "";
                    }
                }
            );

        document
            .getElementById("thumbnailFile")
            ?.addEventListener(
                "change",
                event => {

                    const file =
                        event.target.files[0];

                    const text =
                        document.getElementById(
                            "selectedThumbnail"
                        );

                    if (text) {
                        text.textContent =
                            file
                                ? file.name
                                : "No thumbnail selected";
                    }
                }
            );

        // ACCOUNT

        document
            .getElementById("accountForm")
            ?.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const username =
                        document.getElementById(
                            "username"
                        )?.value.trim();

                    const email =
                        document.getElementById(
                            "email"
                        )?.value.trim();

                    const password =
                        document.getElementById(
                            "password"
                        )?.value;

                    if (!email || !password) {
                        showToast(
                            "Enter your email and password."
                        );
                        return;
                    }

                    const loginMode =
                        document
                            .getElementById(
                                "accountForm"
                            )
                            ?.dataset.mode ===
                        "login";

                    if (loginMode) {
                        await login(
                            email,
                            password
                        );
                    } else {
                        await signup(
                            username ||
                                "Vibely User",
                            email,
                            password
                        );
                    }
                }
            );

        document
            .getElementById("switchLogin")
            ?.addEventListener(
                "click",
                () => {

                    const form =
                        document.getElementById(
                            "accountForm"
                        );

                    if (!form) return;

                    const title =
                        document.getElementById(
                            "accountTitle"
                        );

                    const button =
                        form.querySelector(
                            ".account-submit"
                        );

                    const switchButton =
                        document.getElementById(
                            "switchLogin"
                        );

                    const username =
                        document.getElementById(
                            "username"
                        );

                    if (
                        form.dataset.mode ===
                        "login"
                    ) {

                        form.dataset.mode =
                            "signup";

                        if (title) {
                            title.textContent =
                                "Create Account";
                        }

                        if (button) {
                            button.textContent =
                                "Sign Up";
                        }

                        if (switchButton) {
                            switchButton.textContent =
                                "Already have an account? Log in";
                        }

                        if (username) {
                            username.style.display =
                                "";
                        }

                    } else {

                        form.dataset.mode =
                            "login";

                        if (title) {
                            title.textContent =
                                "Log In";
                        }

                        if (button) {
                            button.textContent =
                                "Log In";
                        }

                        if (switchButton) {
                            switchButton.textContent =
                                "Need an account? Sign up";
                        }

                        if (username) {
                            username.style.display =
                                "none";
                        }
                    }
                }
            );

        document
            .getElementById("closeAccount")
            ?.addEventListener(
                "click",
                () => {
                    const overlay =
                        document.getElementById(
                            "accountOverlay"
                        );

                    if (overlay) {
                        overlay.style.display =
                            "none";
                    }
                }
            );

        // SEARCH

        document
            .getElementById("searchButton")
            ?.addEventListener(
                "click",
                searchVideos
            );

        document
            .getElementById("searchInput")
            ?.addEventListener(
                "keydown",
                event => {
                    if (event.key === "Enter") {
                        searchVideos();
                    }
                }
            );

        // START WATCHING

        document
            .getElementById("startWatching")
            ?.addEventListener(
                "click",
                () => {
                    document
                        .getElementById(
                            "videoGrid"
                        )
                        ?.scrollIntoView({
                            behavior:
                                "smooth"
                        });
                }
            );

        // AUTH STATE

        supabaseClient.auth.onAuthStateChange(
            async () => {

                await updateAuthUI();

                if (
                    watchPage &&
                    watchPage.style.display ===
                        "block"
                ) {
                    await getCurrentUser();
                    updateCommentUI();
                }
            }
        );
    }
);

