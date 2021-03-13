/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable react/button-has-type */
/* eslint-disable consistent-return */
/* eslint-disable promise/catch-or-return */
import React, { useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { Layout, Typography, Tooltip, Button, Dropdown, Menu } from 'antd';
import {
  FullscreenOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  PictureOutlined,
  ReadOutlined,
  ReadFilled,
  RightSquareOutlined,
  LeftSquareOutlined,
  SettingOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  RightOutlined,
  LeftOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import Mousetrap from 'mousetrap';
import { RootState } from '../store';
import {
  changePageNumber,
  setPageNumber,
  setPageUrls,
  setSource,
  setRelevantChapterList,
  toggleShowingSettingsModal,
  setPageDataList,
} from '../features/reader/actions';
import styles from './ReaderPage.css';
import routes from '../constants/routes.json';
import {
  Chapter,
  LayoutDirection,
  PageFit,
  PageView,
  Series,
} from '../models/types';
import {
  getPageData,
  getPageRequesterData,
  getPageUrls,
} from '../services/extension';
import { PageRequesterData } from '../services/extensions/types';
import db from '../services/db';
import { selectMostSimilarChapter } from '../util/comparison';
import ReaderSettingsModal from './ReaderSettingsModal';
import {
  setLayoutDirection,
  setPageFit,
  setPageView,
  setPreloadAmount,
  toggleLayoutDirection,
  togglePageFit,
  togglePageView,
} from '../features/settings/actions';
import { toggleChapterRead } from '../features/library/utils';
import { useForceUpdate } from '../util/reactutil';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const KEYBOARD_SHORTCUTS = {
  previousPage: 'left',
  firstPage: 'ctrl+left',
  nextPage: 'right',
  lastPage: 'ctrl+right',
  previousChapter: '[',
  nextChapter: ']',
  toggleLayoutDirection: 'd',
  togglePageView: 'q',
  togglePageFit: 'f',
  toggleShowingSettingsModal: 'o',
};

const ICONS_PAGE_FIT = {
  [PageFit.Auto]: <FullscreenOutlined />,
  [PageFit.Width]: <ColumnWidthOutlined />,
  [PageFit.Height]: <ColumnHeightOutlined />,
};

const ICONS_PAGE_VIEW = {
  [PageView.Single]: <PictureOutlined />,
  [PageView.Double]: <ReadOutlined />,
  [PageView.Double_OddStart]: <ReadFilled />,
};

const ICONS_LAYOUT_DIRECTION = {
  [LayoutDirection.LeftToRight]: <RightSquareOutlined />,
  [LayoutDirection.RightToLeft]: <LeftSquareOutlined />,
};

const mapState = (state: RootState) => ({
  pageNumber: state.reader.pageNumber,
  lastPageNumber: state.reader.lastPageNumber,
  pageUrls: state.reader.pageUrls,
  pageDataList: state.reader.pageDataList,
  series: state.reader.series,
  chapter: state.reader.chapter,
  relevantChapterList: state.reader.relevantChapterList,
  showingSettingsModal: state.reader.showingSettingsModal,
  pageFit: state.settings.pageFit,
  pageView: state.settings.pageView,
  layoutDirection: state.settings.layoutDirection,
  preloadAmount: state.settings.preloadAmount,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDispatch = (dispatch: any) => ({
  setPageNumber: (pageNumber: number) => dispatch(setPageNumber(pageNumber)),
  changePageNumber: (delta: number) => dispatch(changePageNumber(delta)),
  setPageFit: (pageFit: PageFit) => dispatch(setPageFit(pageFit)),
  togglePageFit: () => dispatch(togglePageFit()),
  setPageView: (pageView: PageView) => dispatch(setPageView(pageView)),
  togglePageView: () => dispatch(togglePageView()),
  setLayoutDirection: (layoutDirection: LayoutDirection) =>
    dispatch(setLayoutDirection(layoutDirection)),
  toggleLayoutDirection: () => dispatch(toggleLayoutDirection()),
  setPreloadAmount: (preloadAmount: number) =>
    dispatch(setPreloadAmount(preloadAmount)),
  setPageUrls: (pageUrls: string[]) => dispatch(setPageUrls(pageUrls)),
  setPageDataList: (pageDataList: string[]) =>
    dispatch(setPageDataList(pageDataList)),
  setSource: (series?: Series, chapter?: Chapter) =>
    dispatch(setSource(series, chapter)),
  setRelevantChapterList: (relevantChapterList: Chapter[]) =>
    dispatch(setRelevantChapterList(relevantChapterList)),
  toggleShowingSettingsModal: () => dispatch(toggleShowingSettingsModal()),
  toggleChapterRead: (chapter: Chapter, series: Series) =>
    toggleChapterRead(dispatch, chapter, series),
});

const connector = connect(mapState, mapDispatch);
type PropsFromRedux = ConnectedProps<typeof connector>;

// eslint-disable-next-line @typescript-eslint/ban-types
type Props = PropsFromRedux & {};

const ReaderPage: React.FC<Props> = (props: Props) => {
  const { chapter_id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const forceUpdate = useForceUpdate();

  const createRelevantChapterList = async (
    series: Series,
    chapter: Chapter
  ) => {
    if (series.id === undefined) return;

    const relevantChapterList: Chapter[] = [];

    const chapters: Chapter[] = await db.fetchChapters(series.id);

    const chapterNumbersSet: Set<string> = new Set();
    chapters.forEach((c: Chapter) => chapterNumbersSet.add(c.chapterNumber));
    const chapterNumbers: number[] = Array.from(chapterNumbersSet)
      .map((chapterNumberStr: string) => parseFloat(chapterNumberStr))
      .sort((a, b) => a - b)
      .reverse();

    chapterNumbers.forEach((chapterNumber: number) => {
      const curChapters: Chapter[] = chapters.filter(
        (c: Chapter) => c.chapterNumber === chapterNumber.toString()
      );

      const bestMatch: Chapter | null = selectMostSimilarChapter(
        chapter,
        curChapters
      );
      if (bestMatch !== null && bestMatch.id !== undefined) {
        relevantChapterList.push(bestMatch);
      }
    });

    props.setRelevantChapterList(relevantChapterList);
  };

  const loadChapterData = async (chapterId: number) => {
    const chapter: Chapter = await db
      .fetchChapter(chapterId)
      .then((response: any) => response[0]);

    if (chapter.seriesId === undefined) return;
    const series: Series = await db
      .fetchSeries(chapter.seriesId)
      .then((response: any) => response[0]);

    props.setSource(series, chapter);
    if (!chapter.read) props.toggleChapterRead(chapter, series);

    createRelevantChapterList(series, chapter);

    const pageUrls: string[] = await getPageRequesterData(
      series.extensionId,
      series.sourceType,
      series.sourceId,
      chapter.sourceId
    ).then((pageRequesterData: PageRequesterData) =>
      getPageUrls(series.extensionId, pageRequesterData)
    );
    props.setPageUrls(pageUrls);

    const curPageDataList: string[] = [];
    for (let i = 0; i < pageUrls.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await getPageData(series.extensionId, series, pageUrls[i]).then(
        (data: string) => {
          curPageDataList[i] = data;
          return props.setPageDataList([...curPageDataList]);
        }
      );
      forceUpdate();
    }
  };

  const getPageMargin = () => {
    return `${props.pageNumber * -100 + 100}%`;
  };

  const getChapterTitleDisplay = (chapter: Chapter | undefined): string => {
    if (chapter === undefined) return 'Loading chapter title...';

    if (chapter.title.length > 0) {
      return `${chapter.chapterNumber} - ${chapter.title}`;
    }
    return `Chapter ${chapter.chapterNumber}`;
  };

  const renderPageImage = (pageNumber: number) => {
    if (props.series === undefined) return;
    if (props.pageUrls.length === 0) return;

    return pageNumber <= props.lastPageNumber && pageNumber > 0 ? (
      <img
        className={styles.pageImage}
        src={props.pageDataList[pageNumber - 1]}
        alt={`page${pageNumber}`}
        loading="lazy"
      />
    ) : (
      <img className={styles.pageImage} src="data:," alt="" />
    );
  };

  const renderTwoPageLayout = (pageNumber: number) => {
    const firstPageNumber =
      props.pageView === PageView.Double_OddStart ? pageNumber - 1 : pageNumber;
    return (
      <>
        <span className={styles.imageColumn}>
          {renderPageImage(
            props.layoutDirection === LayoutDirection.LeftToRight
              ? firstPageNumber
              : firstPageNumber + 1
          )}
        </span>
        <span className={styles.imageColumn}>
          {renderPageImage(
            props.layoutDirection === LayoutDirection.LeftToRight
              ? firstPageNumber + 1
              : firstPageNumber
          )}
        </span>
      </>
    );
  };

  const renderPreloadContainer = (pageNumber: number) => {
    if (props.series === undefined) return;
    if (props.pageUrls.length === 0) return;

    const images = [];

    for (
      let i = pageNumber;
      i < props.lastPageNumber && i < pageNumber + props.preloadAmount;
      i += 1
    ) {
      images.push(
        <img src={props.pageDataList[i]} alt="pagepreload" key={i} />
      );
    }

    return <div className={styles.preloadContainer}>{images}</div>;
  };

  const renderViewer = () => {
    const imageWrappers = [];

    for (let i = 1; i <= props.lastPageNumber; i += 1) {
      imageWrappers.push(
        <Content
          key={i}
          className={`${styles.imageWrapper}
            ${props.pageFit === PageFit.Auto ? styles.fitAuto : ''}
            ${props.pageFit === PageFit.Width ? styles.fitWidth : ''}
            ${props.pageFit === PageFit.Height ? styles.fitHeight : ''}
          `}
          style={{ marginLeft: i === 1 ? getPageMargin() : 0 }}
        >
          {props.pageView === PageView.Single
            ? renderPageImage(i)
            : renderTwoPageLayout(i)}
        </Content>
      );
    }

    return <div className={styles.viewerContainer}>{imageWrappers}</div>;
  };

  const changePage = (left: boolean, toBound = false) => {
    if (toBound) {
      if (props.layoutDirection === LayoutDirection.LeftToRight) {
        props.setPageNumber(left ? 0 : props.lastPageNumber);
      } else {
        props.setPageNumber(left ? props.lastPageNumber : 0);
      }
      return;
    }

    let delta = left ? -1 : 1;

    if (props.layoutDirection === LayoutDirection.RightToLeft) {
      delta = -delta;
    }
    if (props.pageView !== PageView.Single) {
      delta *= 2;
    }

    props.changePageNumber(delta);
  };

  /**
   * Get the ID of a chapter just before or after the current one.
   * @param previous whether to get the previous chapter (instead of the next one)
   * @return the ID of the chapter, or -1 if none exists (or props.chapter or
   *  props.relevantChapterList have not been loaded)
   */
  const getAdjacentChapterId = (previous: boolean): number => {
    if (props.chapter === undefined) return -1;

    const curChapterIndex: number = props.relevantChapterList.findIndex(
      (chapter: Chapter) => chapter.id === props.chapter?.id
    );
    const newChapterIndex = previous
      ? curChapterIndex + 1
      : curChapterIndex - 1;

    if (
      curChapterIndex === -1 ||
      newChapterIndex < 0 ||
      newChapterIndex >= props.relevantChapterList.length
    )
      return -1;

    const id = props.relevantChapterList[newChapterIndex]?.id;
    return id === undefined ? -1 : id;
  };

  const setChapter = (id: number) => {
    props.setPageNumber(1);
    props.setPageUrls([]);
    props.setPageDataList([]);

    loadChapterData(id);
  };

  const changeChapter = (previous: boolean) => {
    const newChapterId = getAdjacentChapterId(previous);
    if (newChapterId === -1) return;
    setChapter(newChapterId);
  };

  const removeKeybindings = () => {
    Mousetrap.unbind(Object.values(KEYBOARD_SHORTCUTS));
  };

  /**
   * Exit the reader page.
   * If the series prop is loaded, go to its series detail page. Otherwise, go to the library.
   */
  const exitPage = () => {
    props.setPageNumber(1);
    props.setPageUrls([]);
    props.setPageDataList([]);
    props.setRelevantChapterList([]);
    removeKeybindings();

    if (props.series !== undefined) {
      history.push(`${routes.SERIES}/${props.series.id}`);
    } else {
      history.push(routes.LIBRARY);
    }
  };

  useEffect(() => {
    loadChapterData(chapter_id);
  }, [location]);

  Mousetrap.bind(KEYBOARD_SHORTCUTS.previousPage, () => changePage(true));
  Mousetrap.bind(KEYBOARD_SHORTCUTS.firstPage, () => changePage(true, true));
  Mousetrap.bind(KEYBOARD_SHORTCUTS.nextPage, () => changePage(false));
  Mousetrap.bind(KEYBOARD_SHORTCUTS.lastPage, () => changePage(false, true));
  Mousetrap.bind(KEYBOARD_SHORTCUTS.previousChapter, () => changeChapter(true));
  Mousetrap.bind(KEYBOARD_SHORTCUTS.nextChapter, () => changeChapter(false));
  Mousetrap.bind(KEYBOARD_SHORTCUTS.toggleLayoutDirection, () =>
    props.toggleLayoutDirection()
  );
  Mousetrap.bind(KEYBOARD_SHORTCUTS.togglePageView, () =>
    props.togglePageView()
  );
  Mousetrap.bind(KEYBOARD_SHORTCUTS.togglePageFit, () => props.togglePageFit());
  Mousetrap.bind(KEYBOARD_SHORTCUTS.toggleShowingSettingsModal, () =>
    props.toggleShowingSettingsModal()
  );

  return (
    <Layout className={styles.pageLayout}>
      <ReaderSettingsModal
        visible={props.showingSettingsModal}
        toggleVisible={props.toggleShowingSettingsModal}
        layoutDirection={props.layoutDirection}
        setLayoutDirection={props.setLayoutDirection}
        pageView={props.pageView}
        setPageView={props.setPageView}
        pageFit={props.pageFit}
        setPageFit={props.setPageFit}
        preloadAmount={props.preloadAmount}
        setPreloadAmount={props.setPreloadAmount}
      />
      <Sider className={styles.sider}>
        <div className={styles.siderHeader}>
          <button className={styles.exitButton} onClick={() => exitPage()}>
            <CloseOutlined />
          </button>
          <Title className={styles.seriesTitle} level={4}>
            {props.series === undefined ? 'loading...' : props.series.title}
          </Title>
        </div>
        <div className={styles.chapterHeader}>
          <Tooltip title="Previous Chapter ([)">
            <button
              className={`${styles.chapterButton}
            ${getAdjacentChapterId(true) === -1 ? styles.disabled : ''}`}
              onClick={() => changeChapter(true)}
            >
              <ArrowLeftOutlined />
            </button>
          </Tooltip>
          <Dropdown
            overlay={
              <Menu
                onClick={(e) => {
                  setChapter(e.item.props['data-value']);
                }}
              >
                {props.relevantChapterList.map((chapter: Chapter) => (
                  <Menu.Item key={chapter.id} data-value={chapter.id}>
                    {getChapterTitleDisplay(chapter)}
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <Text className={`${styles.chapterName}`}>
              {getChapterTitleDisplay(props.chapter)}
            </Text>
          </Dropdown>
          <Tooltip title="Next Chapter (])">
            <button
              className={`${styles.chapterButton}
            ${getAdjacentChapterId(false) === -1 ? styles.disabled : ''}`}
              onClick={() => changeChapter(false)}
            >
              <ArrowRightOutlined />
            </button>
          </Tooltip>
        </div>
        <div className={styles.settingsBar}>
          <Tooltip title="Change page fit (f)">
            <button
              className={`${styles.settingsButton}`}
              onClick={() => props.togglePageFit()}
            >
              {ICONS_PAGE_FIT[props.pageFit]}
            </button>
          </Tooltip>
          <Tooltip title="Change two-page view (q)">
            <button
              className={`${styles.settingsButton}`}
              onClick={() => props.togglePageView()}
            >
              {ICONS_PAGE_VIEW[props.pageView]}
            </button>
          </Tooltip>
          <Tooltip title="Change reader direction (d)">
            <button
              className={`${styles.settingsButton}`}
              onClick={() => props.toggleLayoutDirection()}
            >
              {ICONS_LAYOUT_DIRECTION[props.layoutDirection]}
            </button>
          </Tooltip>
          <Tooltip title="Advanced Settings (o)">
            <button
              className={`${styles.settingsButton}`}
              onClick={() => props.toggleShowingSettingsModal()}
            >
              <SettingOutlined />
            </button>
          </Tooltip>
        </div>
        <div className={styles.pageControlBar}>
          <Tooltip title="First Page (ctrl+←)">
            <button
              className={`${styles.pageButton}`}
              onClick={() => changePage(true, true)}
            >
              <VerticalRightOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Previous Page (←)">
            <button
              className={`${styles.pageButton}`}
              onClick={() => changePage(true)}
            >
              <LeftOutlined />
            </button>
          </Tooltip>
          <Dropdown
            overlay={
              <Menu
                onClick={(e) => {
                  props.setPageNumber(e.item.props['data-value']);
                }}
              >
                {Array.from(
                  { length: props.lastPageNumber },
                  (v, k) => k + 1
                ).map((pageNumber: number) => (
                  <Menu.Item key={pageNumber} data-value={pageNumber}>
                    Page {pageNumber}
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <Text
              className={`${styles.pageNumber}`}
            >{`${props.pageNumber} / ${props.lastPageNumber}`}</Text>
          </Dropdown>
          <Tooltip title="Next Page (→)">
            <button
              className={`${styles.pageButton}`}
              onClick={() => changePage(false)}
            >
              <RightOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Last Page (ctrl+→)">
            <button
              className={`${styles.pageButton}`}
              onClick={() => changePage(false, true)}
            >
              <VerticalLeftOutlined />
            </button>
          </Tooltip>
        </div>
        <div className={styles.groupRow}>
          <Text>Group: {props.chapter?.groupName}</Text>
        </div>
      </Sider>
      <Layout className={`site-layout ${styles.contentLayout}`}>
        {renderPreloadContainer(props.pageNumber)}
        {renderViewer()}
      </Layout>
    </Layout>
  );
};

export default connector(ReaderPage);
