const header = document.getElementById("header");
const pagination = document.getElementById("swiper-pagination");

const swiper = new Swiper(".main_swiper", {
  direction: "vertical",
  mousewheel: true,
  slidesPerView: 1,
  speed: 1200,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  on: {
    slideChange: () => {
      if (swiper.activeIndex === 6) {
        header.classList.add("black_theme");
        pagination.classList.add("black_theme");
      } else {
        header.classList.remove("black_theme");
        pagination.classList.remove("black_theme");
      }
    },
  },
});

// Start - Header JS Code
document.getElementById("globe_icon").addEventListener("click", (e) => {
  document.getElementById("lang_list").classList.toggle("list-animate");
});

const header_menu_anchors = document.querySelectorAll(
  "header ul.menu_list li.menu_item a"
);

for (let idx = 0; idx < header_menu_anchors.length; idx++) {
  header_menu_anchors[idx].addEventListener("click", (e) => {
    e.preventDefault();

    swiper.slideTo(idx);
  });
}
// End - Header JS Code
