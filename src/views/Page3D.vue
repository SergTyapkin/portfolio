<style scoped lang="stylus">
@import '../styles/constants.styl'
@import '../styles/buttons.styl'
@import '../styles/fonts.styl'
@import '../styles/utils.styl'

.root-page-3d
  > *
    centered-absolute-transform()
</style>

<template>
  <div class="root-page-3d">
    <div ref="rootThree3d"></div>
    <transition name="opacity">
      <Progress v-if="!$refs?.progress?.isLoaded" class="progress" size="200px" ref="progress" :progress="progress"></Progress>
    </transition>
  </div>
</template>


<script>
import World from "~/src_3d/World";
import AssetsTrackerLoader from "~/src_3d/AssetsTrackerLoader";
import Progress from "~/components/Progress.vue";

export default {
  components: {Progress},

  data() {
    return {
      world: undefined,
      progress: 0,

      AssetsTrackerLoader,

      updatingInterval: undefined,
    }
  },

  async mounted() {
    this.updatingInterval = setInterval(() => {
      this.progress = AssetsTrackerLoader.totalProgress;
      if (this.progress >= 1) {
        clearInterval(this.updatingInterval);
      }
    }, 50);

    // create a new world
    this.world = new World(this.$refs.rootThree3d);

    // complete async tasks
    await this.world.init();

    // start the animation loop
    this.world.start();

  },

  unmounted() {
    this.world.dispose();
    clearInterval(this.updatingInterval);
  },

  methods: {
  }
}
</script>
