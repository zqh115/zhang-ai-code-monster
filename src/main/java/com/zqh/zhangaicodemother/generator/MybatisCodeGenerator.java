package com.zqh.zhangaicodemother.generator;



import cn.hutool.core.lang.Dict;
import cn.hutool.setting.yaml.YamlUtil;
import com.mybatisflex.codegen.Generator;
import com.mybatisflex.codegen.config.ColumnConfig;
import com.mybatisflex.codegen.config.GlobalConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.util.Map;


public class MybatisCodeGenerator {


    private static final String DATABASE_NAME = "user";
    /**
     * 运行该方法，即可生成代码
     */
    public static void main(String[] args) {
        //读取配置文件
        Dict dict = YamlUtil.loadByPath("application.yml");
        Map<String, Object> map =  dict.getByPath("spring.datasource");
        String url = (String) map.get("url");
        String username = (String) map.get("username");
        String password = (String) map.get("password");

        //配置数据源
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        //创建配置内容，两种风格都可以。
//        GlobalConfig globalConfig = createGlobalConfigUseStyle1();
        GlobalConfig globalConfig = createGlobalConfigUseStyle2();

        //通过 datasource 和 globalConfig 创建代码生成器
        Generator generator = new Generator(dataSource, globalConfig);

        //生成代码
        generator.generate();
    }

    public static GlobalConfig createGlobalConfigUseStyle2() {
        //创建配置内容
        GlobalConfig globalConfig = new GlobalConfig();

        //设置根包
        globalConfig.getPackageConfig()
                .setBasePackage("com.zqh.zhangaicodemother.genresult");

        //设置表前缀和只生成哪些表，setGenerateTable 未配置时，生成所有表
        globalConfig.getStrategyConfig()
                .setGenerateTable(DATABASE_NAME)
                //设置逻辑删除字段
                .setLogicDeleteColumn("is_deleted");
        //设置生成 entity 并启用 Lombok
        globalConfig.enableEntity()
                .setWithLombok(true)
                .setJdkVersion(21);

        //设置生成 mapper
        globalConfig.enableMapper();
        globalConfig.enableMapperXml();

        //设置生成 service
        globalConfig.enableService();
        globalConfig.enableServiceImpl();

        //设置生成 controller
        globalConfig.enableController();

        //设置生成注释
        globalConfig.getJavadocConfig()
                .setAuthor("<a href=\"https://github.com/zqh-zhangqiuhui\">zqh</a>")
                .setSince("");

        return globalConfig;
    }
}