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

var DEFAULT_PULL_DISTANCE = 30;
var DEFAULT_HF_HEIGHT = 60;
const arrowImage = require('./img/pull_down_circle.png');
const loadingImage = require('./img/loading.png');

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
          <View style={styles.header}>
            <View style={styles.content}>
              <Image
                source={arrowImage}
                resizeMode={Image.resizeMode.stretch}
                style={styles.image}/>
              <Text style={styles.text}>pull down refresh...</Text>
            </View>
          </View>
        );
      },
      renderHeaderWillRefresh: () => {
        return (
          <View style={styles.header}>
            <View style={styles.content}>
              <Image
                source={arrowImage}
                resizeMode={Image.resizeMode.stretch}
                style={[styles.image, styles.imageRotate]}/>
              <Text style={styles.text}>release to refresh...</Text>
            </View>
           </View>
        );
      },
      renderHeaderRefreshing: () => {
        return (
          <View style={[styles.header, {alignItems: 'center'}]}>
            <LoadingView/>
            <Text style={styles.text}>refreshing...</Text>
          </View>
        );
      },
      renderFooterInifiteIdle: () => {
        return (
          <View style={styles.footer}>
            <View style={styles.content}>
              <Image
                source={arrowImage}
                resizeMode={Image.resizeMode.stretch}
                style={[styles.image, styles.imageRotate]}/>
              <Text style={styles.text}>pull up to load more...</Text>
            </View>
          </View>
        );
      },
      renderFooterWillInifite: () => {
        return (
          <View style={styles.footer}>
            <View style={styles.content}>
              <Image
                source={arrowImage}
                resizeMode={Image.resizeMode.stretch}
                style={styles.image}/>
              <Text style={styles.text}>release to load more...</Text>
            </View>
          </View>
        );
      },
      renderFooterInifiting: () => {
        return (
          <View style={[styles.footer, {alignItems: 'center'}]}>
            <LoadingView/>
            <Text style={styles.text}>loading...</Text>
          </View>
        );
      },
      renderFooterInifiteLoadedAll: () => {
        return (
          <View style={[styles.footer, {alignItems: 'center'}]}>
            <Text style={styles.text}>have loaded all data</Text>
          </View>
        );
      },
      renderBlank: () => {
        return (
          <View style={styles.footer}/>
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

  componentDidMount() {
    this.resetListView();
  },

  renderRow(rowData, sectionID, rowId) {
    if (this.dataSource) {
      return this.props.renderEmptyRow();
    } else {
      if (rowId == this.props.dataSource.getRowCount() - 1) {
        return (
          <View onLayout={(e) => {
            this.contentHeight = e.nativeEvent.layout.y + e.nativeEvent.layout.height;}}>
            {this.props.renderRow(rowData, sectionID, rowId)}
          </View>);
      } else {
        return this.props.renderRow(rowData, sectionID, rowId);
      }
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
      return this.props.renderBlank();
    }
  },

  renderFooter() {
    return (
      <View>
        <View style={{height: this.state.paddingHeight, backgroundColor: 'transparent'}}/>
        {this.renderFooterContent()}
      </View>
    );
  },

  renderFooterContent() {
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
      return this.props.renderBlank();
    }
  },

  handleResponderGrant(event) {
    this.repondering = true;
  },

  handleScroll(event) {
    let nativeEvent = event.nativeEvent;
    let status = this.state.status;
    if (status === STATUS_REFRESHING || status === STATUS_INFINITING) {
      return;
    }
    let y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y;
    let releaseHeight = this.props.footerHeight - this.props.pullDistance;
    this.footerScrollHeight = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height;
    if (y >= releaseHeight && y < this.props.footerHeight) {
      this.setState({ status: STATUS_REFRESH_IDLE });
    } else if (y < releaseHeight) {
      this.setState({ status: STATUS_WILL_REFRESH });
    } else if (y >= this.props.footerHeight && y < this.footerScrollHeight - this.props.footerHeight) {
      this.setState({ status: STATUS_NONE });
    } else if (y >= this.footerScrollHeight - this.props.footerHeight && y < this.footerScrollHeight - releaseHeight) {
      if (this.props.loadedAllData()) {
        this.setState({ status: STATUS_INFINITE_LOADED_ALL });
      } else {
        this.setState({ status: STATUS_INFINITE_IDLE });
      }
    } else if (y >= this.footerScrollHeight - releaseHeight) {
      if (this.props.loadedAllData()) {
        this.setState({ status: STATUS_INFINITE_LOADED_ALL });
      } else {
        this.setState({ status: STATUS_WILL_INFINITE });
      }
    }
  },

  handleResponderRelease() {
    this.handleStatus();
    this.repondering = false;
  },

  handleMomentumScrollEnd(event) {
    if (this.repondering) {
      return;
    }
    let nativeEvent = event.nativeEvent;
    let status = this.state.status;
    if (status === STATUS_REFRESHING || status === STATUS_INFINITING) {
      return;
    }
    let y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y;
    this.footerScrollHeight = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height;
    if (y < this.props.footerHeight) {
      this.setState({ status: STATUS_REFRESH_IDLE });
      this.resetListView();
    } else if (y >= this.props.footerHeight && y < this.footerScrollHeight - this.props.footerHeight) {
      this.setState({ status: STATUS_NONE });
    } else if (y >= this.footerScrollHeight - this.props.footerHeight) {
      if (this.props.loadedAllData()) {
        this.setState({ status: STATUS_INFINITE_LOADED_ALL });
      } else {
        this.setState({ status: STATUS_INFINITING });
        this.infinite();
      }
    }
  },

  handleStatus() {
    switch (this.state.status) {
    case STATUS_REFRESH_IDLE:
      this.resetListView();
      this.setState({ status: STATUS_NONE });
      break;
    case STATUS_WILL_REFRESH:
      this.setState({ status: STATUS_REFRESHING });
      this.refresh();
      break;
    case STATUS_INFINITE_IDLE:
      this.resetListView(false);
      this.setState({ status: STATUS_NONE });
      break;
    case STATUS_WILL_INFINITE:
      this.setState({ status: STATUS_INFINITING });
      this.infinite();
      break;
    case STATUS_INFINITE_LOADED_ALL:
      break;
    default:
      break;
    }
  },

  hideHeader() {
    this.setState({ status: STATUS_NONE });
    this.resetListView();
    setTimeout(() => {
      this.setState({paddingHeight: Math.max(this.listViewHeight + this.props.footerHeight - this.contentHeight, 0)});
      this.resetListView();
    }, 10);
  },

  hideFooter() {
    this.setState({ status: STATUS_NONE });
    this.resetListView(false);
    setTimeout(() => {
      this.setState({paddingHeight: Math.max(this.listViewHeight + this.props.footerHeight - this.contentHeight, 0)});
      this.resetListView(false);
    }, 10);
  },

  resetListView(top = true) {
    if (top) {
      this.refs.listView && setTimeout(() => this.refs.listView.scrollTo({y: this.props.footerHeight, aimated: true}), 1);
    } else {
      this.refs.listView && setTimeout(() => this.refs.listView.scrollTo({y: this.footerScrollHeight - this.props.footerHeight, aimated: true}), 1);
    }
  },

  refresh() {
    this.refs.listView.scrollTo({y: 0});
    this.props.onRefresh();
  },

  infinite() {
    this.refs.listView.scrollTo({y: this.footerScrollHeight});
    this.props.onInfinite();
  },

  handleLayout(e) {
    this.props.onLayout && this.props.onLayout(e);
    this.listViewHeight = e.nativeEvent.layout.height;
    if (this.contentHeight && this.listViewHeight && !this.paddOnce) {
      this.setState({paddingHeight: Math.max(this.listViewHeight + this.props.footerHeight - this.contentHeight, 0)});
      this.paddOnce = true;
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
        ref="listView"
        onLayout={this.handleLayout}
        showsVerticalScrollIndicator={false}
        dataSource={this.dataSource || this.props.dataSource}
        renderHeader={this.renderHeader}
        renderFooter={this.renderFooter}
        renderRow={this.renderRow}
        onScrollBeginDrag={this.handleResponderGrant}
        onScrollEndDrag={this.handleResponderRelease}
        onMomentumScrollEnd={this.handleMomentumScrollEnd}
        onScroll={this.handleScroll}/>
    );
  }
});

var styles = StyleSheet.create({
  header: {
    height: DEFAULT_HF_HEIGHT,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  footer: {
    height: DEFAULT_HF_HEIGHT,
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  content: {
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
