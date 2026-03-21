package com.zqh.zhangaicodemother.aop;

import com.zqh.zhangaicodemother.annotation.AuthCheck;
import com.zqh.zhangaicodemother.exception.BusinessException;
import com.zqh.zhangaicodemother.exception.ErrorCode;
import com.zqh.zhangaicodemother.model.entity.User;
import com.zqh.zhangaicodemother.model.enums.UserRoleEnum;
import com.zqh.zhangaicodemother.service.UserService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
@Aspect
@Component
public class AuthInterceptor {

    @Resource
    private UserService userService;

    /**
     * 执行拦截
     * @param joinPoint 切入点
     * @param authCheck  注解
     * @return
     * @throws Throwable
     */

    @Around("@annotation(authCheck)")
    public Object doInterceptor(ProceedingJoinPoint joinPoint, AuthCheck authCheck) throws Throwable {
        String mustRole = authCheck.mustRole();
        // 获取当前登录用户
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        HttpServletRequest request =( (ServletRequestAttributes) requestAttributes).getRequest();
        User loginUser = userService.getLoginUser(request);
        UserRoleEnum mustUserRoleEnum = UserRoleEnum.getEnumByValue(mustRole);
        //不需要权限放行
        if (mustUserRoleEnum == null) {
            throw new RuntimeException("mustRole error, mustRole:" + mustRole);
        }
        //以下代码需要权限
        UserRoleEnum userRoleEnum = UserRoleEnum.getEnumByValue(loginUser.getUserRole());
        if (userRoleEnum == null ) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        //要求管理员权限
        if (UserRoleEnum.ADMIN.equals(mustUserRoleEnum)&& !userRoleEnum.equals(mustUserRoleEnum)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        //通过权限校验，放行
        return joinPoint.proceed();
    }
}
