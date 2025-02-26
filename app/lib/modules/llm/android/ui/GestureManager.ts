touch2.pageX - touch1.pageX
    ) * 180 / Math.PI;
  }

  createAnimation(id: string, config: Animated.TimingAnimationConfig): Animated.CompositeAnimation {
    const value = new Animated.Value(0);
    this.animations.set(id, value);

    return Animated.timing(value, {
      ...config,
      useNativeDriver: true
    });
  }

  getAnimatedValue(id: string): Animated.Value | undefined {
    return this.animations.get(id);
  }

  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('gesture_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.updateConfig(this.config);
  }
}