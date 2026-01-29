let authToken = localStorage.getItem("authToken");

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIconBtn = document.getElementById("user-icon-btn");
  const loginDropdown = document.getElementById("login-dropdown");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const loginFormContainer = document.getElementById("login-form-container");
  const logoutContainer = document.getElementById("logout-container");
  const loggedInAs = document.getElementById("logged-in-as");
  const signupContainer = document.getElementById("signup-container");
  const studentInfo = document.getElementById("student-info");

  // Toggle login dropdown
  userIconBtn.addEventListener("click", () => {
    loginDropdown.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!userIconBtn.contains(e.target) && !loginDropdown.contains(e.target)) {
      loginDropdown.classList.add("hidden");
    }
  });

  // Handle login
  loginBtn.addEventListener("click", async () => {
    loginError.classList.add("hidden");
    const username = loginUsername.value;
    const password = loginPassword.value;

    if (!username || !password) {
      loginError.textContent = "Please enter username and password";
      loginError.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const result = await response.json();
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        updateAuthUI(true, username);
        loginUsername.value = "";
        loginPassword.value = "";
        loginDropdown.classList.add("hidden");
      } else {
        loginError.textContent = "Invalid username or password";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout?token=" + authToken, { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    authToken = null;
    localStorage.removeItem("authToken");
    updateAuthUI(false, "");
    loginDropdown.classList.add("hidden");
  });

  // Update UI based on authentication
  function updateAuthUI(isLoggedIn, username) {
    if (isLoggedIn) {
      loginFormContainer.classList.add("hidden");
      logoutContainer.classList.remove("hidden");
      loggedInAs.querySelector("strong").textContent = username;
      signupContainer.classList.remove("hidden");
      studentInfo.classList.add("hidden");
      
      // Update delete buttons to show only for logged-in users
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "inline-block";
      });
    } else {
      loginFormContainer.classList.remove("hidden");
      logoutContainer.classList.add("hidden");
      signupContainer.classList.add("hidden");
      studentInfo.classList.remove("hidden");
      
      // Hide delete buttons for non-authenticated users
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "none";
      });
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" style="display: ${authToken ? "inline-block" : "none"}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authToken) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!authToken) {
      messageDiv.textContent = "You must be logged in as a teacher to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
  updateAuthUI(!!authToken, authToken ? "Teacher" : "");
});
