<template>
  <div class="top-rice">
    <!-- Mentorbook banner -->
    <div v-if="showMentorbook" class="mentorbook-banner">
      <a href="https://mentorbook.ai/" target="_blank" class="banner-content">
        <div class="brand-name">Mentorbook.AI</div>
        <div class="main-slogan">
          {{ isCN ? '你的 AI 导师，你的学习助手' : 'Your AI Mentor, Your Learning Journey' }}
        </div>
        <div class="value-props">
          {{
            isCN
              ? '✨ 个性化课程 · 即时反馈 · 100+ 学科领域'
              : '✨ Personalized Courses · Instant Feedback · 100+ Subjects'
          }}
        </div>
      </a>
      <a href="https://mentorbook.ai/" target="_blank" class="start-button">
        {{ isCN ? '免费开始' : 'Get Started Free' }}
      </a>
    </div>
  </div>
</template>
<script>
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);
// import WWAds from './WWAds.vue';
const isEffective = (start, end) => {
  return dayjs().isBetween(start, end);
};
export default {
  components: {
    // WWAds,
  },
  props: ['isCN', 'isMobile'],
  data() {
    return {
      show: true,
      showMentorbook: true,
      cnAds: [
        {
          img: `https://yidengfe.com/launches/01/yd.png?v=${Date.now()}`,
          href: 'https://yidengfe.com/launches/01/yd.html',
          visible: true,
        },
      ].filter(ad => ad.visible),
      enAds: [
        {
          img: `https://yidengfe.com/launches/01/yd.png?v=${Date.now()}`,
          href: 'https://yidengfe.com/launches/01/yd.html',
          visible: true,
        },
      ].filter(ad => ad.visible),
    };
  },
  computed: {
    otherAds() {
      return this.isCN ? this.cnAds : this.enAds;
    },
  },
};
</script>

<style lang="less" scoped>
.top-rice {
  width: 100%;
  margin-bottom: 16px;

  .mentorbook-banner {
    display: flex;
    width: 100%;
    background: linear-gradient(135deg, #0b1021 0%, #182a4a 100%);
    position: relative;
    overflow: hidden;
    padding: 0 16px;
    height: 48px;
    box-sizing: border-box;
    align-items: center;
    justify-content: space-between;

    // Dots pattern background
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: radial-gradient(circle, rgba(127, 179, 255, 0.12) 2px, transparent 2px);
      background-size: 28px 28px;
      background-position: 0 0;
      pointer-events: none;
      z-index: 0;
    }

    // Left brace
    &::after {
      content: '{';
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 32px;
      font-family: monospace;
      color: #5df2a3;
      opacity: 0.08;
      pointer-events: none;
      z-index: 0;
    }

    .banner-content {
      position: relative;
      z-index: 1;
      flex: 1;
      height: 48px;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      transition: opacity 0.3s;

      &:hover {
        opacity: 0.9;
      }
    }

    .start-button {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      padding: 0 16px;
      background: #5df2a3;
      color: #0b1021;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      border-radius: 6px;
      white-space: nowrap;
      transition: all 0.3s;
      margin-left: 16px;

      &:hover {
        background: #4dd893;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(93, 242, 163, 0.3);
      }

      &:active {
        transform: translateY(0);
      }

      @media (max-width: 768px) {
        font-size: 12px;
        padding: 0 12px;
        height: 28px;
      }

      @media (max-width: 480px) {
        font-size: 11px;
        padding: 0 10px;
        height: 26px;
        margin-left: 8px;
      }
    }

    .brand-name {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-weight: 800;
      font-size: 20px;
      color: #5df2a3;
      line-height: 48px;
      white-space: nowrap;

      @media (max-width: 768px) {
        font-size: 18px;
      }

      @media (max-width: 480px) {
        font-size: 16px;
      }
    }

    .main-slogan {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-weight: 600;
      font-size: 16px;
      color: #eaf2ff;
      line-height: 48px;
      white-space: nowrap;

      @media (max-width: 768px) {
        font-size: 14px;
      }

      @media (max-width: 480px) {
        display: none;
      }
    }

    .value-props {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-weight: 500;
      font-size: 14px;
      color: #7fb3ff;
      line-height: 48px;
      white-space: nowrap;

      @media (max-width: 1024px) {
        display: none;
      }
    }
  }

  .ad-link {
    display: block;
    width: 100%;
    text-decoration: none;
    transition: opacity 0.3s;
    margin-top: 16px;

    &:hover {
      opacity: 0.9;
    }
  }

  .ad-image {
    width: 100%;
    max-width: 1200px;
    height: auto;
    display: block;
    margin: 0 auto;
  }
}
</style>
