package com.zqh.zhangaicodemother.model.dto.app;

import java.io.Serial;
import java.io.Serializable;
import lombok.Data;

@Data
public class AppUpdateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * id
     */
    private Long id;

    /**
     * 应用名称
     */
    private String appName;
}
