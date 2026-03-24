package com.zqh.zhangaicodemother.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.core.service.IService;
import com.zqh.zhangaicodemother.model.dto.app.AppQueryRequest;
import com.zqh.zhangaicodemother.model.entity.App;
import com.zqh.zhangaicodemother.model.entity.User;
import com.zqh.zhangaicodemother.model.vo.AppVO;

import java.util.List;

/**
 * 应用服务层。
 *
 * @author <a href="https://github.com/zqh-zhangqiuhui">zqh</a>
 */
public interface AppService extends IService<App> {

    AppVO getAppVO(App app);

    QueryWrapper getQueryWrapper(AppQueryRequest appQueryRequest);

    List<AppVO> getAppVOList(List<App> appList);

}
