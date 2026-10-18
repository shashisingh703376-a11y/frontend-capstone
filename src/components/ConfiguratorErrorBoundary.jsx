import React from 'react';
import ConfiguratorFallback from './ConfiguratorFallback.jsx';

export default class ConfiguratorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Configurator 3D Canvas Error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ConfiguratorFallback
          colorway={this.props.colorway}
          finish={this.props.finish}
          exploded={this.props.exploded}
          isError={true}
          errorMessage={this.state.error?.message || 'WebGL rendering context encountered an error.'}
          onRetry={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}
