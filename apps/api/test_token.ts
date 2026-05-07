const token = "ThQuCDHuqL9RUdjtuusQgCiYkLGskUiY";

async function test() {
    console.log("Testing with token:", token);
    const res = await fetch("https://taskdashboard-api.onrender.com/api/auth/get-session", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}

test();
