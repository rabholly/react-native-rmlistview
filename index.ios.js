import React, { PropTypes, Component } from 'react';
import ReactNative from 'react-native';

var {
  Image,
  View,
  Text,
  StyleSheet,
  ListView,
  Easing,
  Animated
} = ReactNative;

/*list status change graph
 *
 *STATUS_NONE->[STATUS_REFRESH_IDLE, STATUS_INFINITE_IDLE, STATUS_INFINITE_LOADED_ALL]
 *STATUS_REFRESH_IDLE->[STATUS_NONE, STATUS_WILL_REFRESH]
 *STATUS_WILL_REFRESH->[STATUS_REFRESH_IDLE, STATUS_REFRESHING]
 *STATUS_REFRESHING->[STATUS_NONE]
 *STATUS_INFINITE_IDLE->[STATUS_NONE, STATUS_WILL_INFINITE]
 *STATUS_WILL_INFINITE->[STATUS_INFINITE_IDLE, STATUS_INFINITING]
 *STATUS_INFINITING->[STATUS_NONE]
 *STATUS_INFINITE_LOADED_ALL->[STATUS_NONE]
 *
 */
const
      STATUS_NONE = 0,
      STATUS_REFRESH_IDLE = 1,
      STATUS_WILL_REFRESH = 2,
      STATUS_REFRESHING = 3,
      STATUS_INFINITE_IDLE = 4,
      STATUS_WILL_INFINITE = 5,
      STATUS_INFINITING = 6,
      STATUS_INFINITE_LOADED_ALL = 7;

var DEFAULT_PULL_DISTANCE = 60;
var DEFAULT_HF_HEIGHT = 48;
const arrowImage = require('../../image/pull_down_circle.png');
const loadingImage = require('../../image/loading.png');

class LoadingView extends Component {
  constructor(props) {
    super(props);
    this.state = { rotation: new Animated.Value(0) };
  }

  componentDidMount() {
    this.startAnimation();
  }

  startAnimation() {
    this.state.rotation.setValue(0);
    Animated.timing(this.state.rotation, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear
    }).start(() => this.startAnimation());
  }

  render() {
    let transform = {
      transform: [{
        rotate: this.state.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
        })
      }]
    };
    return (<Animated.Image
              source={loadingImage}
              style={[styles.image, transform]}/>);
  }
}

var RefreshLoadMoreListView = React.createClass({
  propTypes: {
    footerHeight: PropTypes.number,
    pullDistance: PropTypes.number,
    renderEmptyRow: PropTypes.func,
    renderHeaderRefreshIdle: PropTypes.func,
    renderHeaderWillRefresh: PropTypes.func,
    renderHeaderRefreshing: PropTypes.func,
    renderFooterInifiteIdle: PropTypes.func,
    renderFooterWillInifite: PropTypes.func,
    renderFooterInifiting: PropTypes.func,
    renderFooterInifiteLoadedAll: PropTypes.func,
  },

  getDefaultProps() {
    return {
      footerHeight: DEFAULT_HF_HEIGHT,
      pullDistance: DEFAULT_PULL_DISTANCE,
      renderEmptyRow: () => {
        return (
          <View />
        );
      },
      renderHeaderRefreshIdle: () => {
        return (
          <View style={styles.headerAndFooter}>
            <Image
              source={arrowImage}
              resizeMode={Image.resizeMode.stretch}
              style={styles.image}/>
            <Text style={styles.text}>pull down refresh...</Text>
          </View>
        );
      },
      renderHeaderWillRefresh: () => {
        return (
          <View style={styles.headerAndFooter}>
            <Image
              source={arrowImage}
              resizeMode={Image.resizeMode.stretch}
              style={[styles.image, styles.imageRotate]}/>
            <Text style={styles.text}>release to refresh...</Text>
           </View>
        );
      },
      renderHeaderRefreshing: () => {
        return (
          <View style={styles.headerAndFooter}>
            <LoadingView/>
            <Text style={styles.text}>refreshing...</Text>
          </View>
        );
      },
      renderFooterInifiteIdle: () => {
        return (
          <View style={styles.headerAndFooter}>
            <Image
              source={arrowImage}
              resizeMode={Image.resizeMode.stretch}
              style={[styles.image, styles.imageRotate]}/>
            <Text style={styles.text}>pull up to load more...</Text>
          </View>
        );
      },
      renderFooterWillInifite: () => {
        return (
          <View style={styles.headerAndFooter}>
            <Image
              source={arrowImage}
              resizeMode={Image.resizeMode.stretch}
              style={styles.image}/>
            <Text style={styles.text}>release to load more...</Text>
          </View>
        );
      },
      renderFooterInifiting: () => {
        return (
          <View style={styles.headerAndFooter}>
            <LoadingView/>
            <Text style={styles.text}>loading...</Text>
          </View>
        );
      },
      renderFooterInifiteLoadedAll: () => {
        return (
          <View style={styles.headerAndFooter}>
            <Text style={styles.text}>have loaded all data</Text>
          </View>
        );
      },
      loadedAllData: () => {
        return false;
      },
      onRefresh: () => {
        //todo
      },
      onInfinite: () => {
        //todo
      },
    };
  },

  getInitialState() {
    return {
      status: STATUS_NONE
    };
  },

  renderRow(rowData, sectionID, rowId) {
    if (this.dataSource) {
      return this.props.renderEmptyRow();
    } else {
      return this.props.renderRow(rowData, sectionID, rowId);
    }
  },

  renderHeader() {
    switch (this.state.status) {
    case STATUS_REFRESH_IDLE:
      return this.props.renderHeaderRefreshIdle();
    case STATUS_WILL_REFRESH:
      return this.props.renderHeaderWillRefresh();
    case STATUS_REFRESHING:
      return this.props.renderHeaderRefreshing();
    default:
      return null;
    }
  },

  renderFooter() {
    this.footerIsRender = true;
    switch (this.state.status) {
    case STATUS_INFINITE_IDLE:
      return this.props.renderFooterInifiteIdle();
    case STATUS_WILL_INFINITE:
      return this.props.renderFooterWillInifite();
    case STATUS_INFINITING:
      return this.props.renderFooterInifiting();
    case STATUS_INFINITE_LOADED_ALL:
      return this.props.renderFooterInifiteLoadedAll();
    default:
      this.footerIsRender = false;
      return null;
    }
  },

  handleResponderGrant(event) {
    var nativeEvent = event.nativeEvent;
    if (!nativeEvent.contentInset || this.state.status !== STATUS_NONE) {
      return;
    }
    var y0 = nativeEvent.contentInset.top + nativeEvent.contentOffset.y;
    if (y0 < 0) {
      this.setState({ status: STATUS_REFRESH_IDLE });
      return;
    }
    y0 = nativeEvent.contentInset.top + nativeEvent.contentOffset.y +
      nativeEvent.layoutMeasurement.height - nativeEvent.contentSize.height;
    if (y0 > 0) {
      if (this.props.loadedAllData()) {
        this.setState({ status: STATUS_INFINITE_LOADED_ALL });
      } else {
        this.initialInfiniteOffset = (y0 > 0 ? y0 : 0);
        this.setState({ status: STATUS_INFINITE_IDLE });
      }
    }
  },

  hideHeader() {
    this.setState({ status: STATUS_NONE });
  },

  hideFooter() {
    this.setState({ status: STATUS_NONE });
  },

  handleResponderRelease() {
    switch (this.state.status) {
    case STATUS_REFRESH_IDLE:
      this.setState({ status: STATUS_NONE });
      break;
    case STATUS_WILL_REFRESH:
      this.setState({ status: STATUS_REFRESHING });
      this.props.onRefresh();
      break;
    case STATUS_INFINITE_IDLE:
      this.setState({ status: STATUS_NONE });
      break;
    case STATUS_WILL_INFINITE:
      this.setState({ status: STATUS_INFINITING });
      this.props.onInfinite();
      break;
    case STATUS_INFINITE_LOADED_ALL:
      this.setState({ status: STATUS_NONE });
      break;
    default:
      break;
    }
  },

  handleScroll(event) {
    var nativeEvent = event.nativeEvent;
    var status = this.state.status;
    if (status === STATUS_REFRESH_IDLE || status === STATUS_WILL_REFRESH) {
      var y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y;
      if (status !== STATUS_WILL_REFRESH && y < -this.props.pullDistance) {
        this.setState({ status: STATUS_WILL_REFRESH });
      } else if (status === STATUS_WILL_REFRESH && y >= -this.props.pullDistance) {
        this.setState({ status: STATUS_REFRESH_IDLE });
      }
      return;
    }

    if (status === STATUS_INFINITE_IDLE || status === STATUS_WILL_INFINITE) {
      var y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height - nativeEvent.contentSize.height - this.initialInfiniteOffset;
      if (this.footerIsRender) {
        y += this.props.footerHeight;
      }
      if (status !== STATUS_WILL_INFINITE && y > this.props.pullDistance) {
        this.setState({ status: STATUS_WILL_INFINITE });
      } else if (status === STATUS_WILL_INFINITE && y <= this.props.pullDistance) {
        this.setState({ status: STATUS_INFINITE_IDLE });
      }
    }
  },

  render() {
    this.dataSource = null;
    if (!this.props.dataSource.getRowCount()) {
      var DataSource = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
      this.dataSource = DataSource.cloneWithRows([]);
    }

    return (
      <ListView
        {...this.props}
        enableEmptySections={true}
        dataSource={this.dataSource || this.props.dataSource}
        renderHeader={this.renderHeader}
        renderFooter={this.renderFooter}
        onResponderGrant={this.handleResponderGrant}
        onResponderRelease={this.handleResponderRelease}
        onScroll={this.handleScroll}
        />
    );
  }
});

var styles = StyleSheet.create({
  headerAndFooter: {
    height: DEFAULT_HF_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    fontSize: 14,
  },
  image: {
    width: 18,
    height: 18,
    marginRight: 6
  },
  imageRotate: {
    transform: [{ rotateX: '180deg' }]
  }
});

module.exports = RefreshLoadMoreListView;
