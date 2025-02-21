// Enhanced Theme System
const CONFIG = {
  DEFAULT_THEME: "light",
  THEMES: ["light", "dark", "green", "blue", "professional"],
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.className = theme;
  localStorage.setItem("selected-theme", theme);

  // Update theme selector
  document.querySelectorAll(".theme-option").forEach((option) => {
    option.classList.remove("active");
    if (option.dataset.theme === theme) option.classList.add("active");
  });
};

// Scroll Animation Handler
const animateOnScroll = () => {
  document.querySelectorAll(".animate").forEach((element) => {
    const elementTop = element.getBoundingClientRect().top;
    if (elementTop < window.innerHeight * 0.8) {
      element.classList.add("active");
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme =
    localStorage.getItem("selected-theme") || CONFIG.DEFAULT_THEME;
  applyTheme(savedTheme);

  // Initialize scroll animations
  window.addEventListener("scroll", animateOnScroll);
  animateOnScroll();

  // Initialize smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });
});

// Scroll Progress Indicator
window.onscroll = () => {
  // Progress bar
  const winScroll =
    document.body.scrollTop || document.documentElement.scrollTop;
  const height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  document.querySelector(".progress-bar").style.width = scrolled + "%";

  document.querySelector(".back-to-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Back to top button
  const topButton = document.querySelector(".back-to-top");
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    topButton.classList.add("visible");
  } else {
    topButton.classList.remove("visible");
  }
};

// Close theme menu when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".theme-selector")) {
    document.querySelector(".theme-menu").style.display = "none";
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
