plugins {
    `java-library`
    id("dev.atlas.kotlin")
}

atlas {
    models {
        create("jvm") {
            target.set("jvm")
            compilation.set("main")
            modelFile.set(rootProject.file("architecture/models/lib-jvm.atlas.module.yml"))
            generateOnBuild.set(true)
        }
    }
}

dependencies {
    implementation("org.apache.commons:commons-lang3:3.17.0")
    implementation("com.google.guava:guava:33.4.0-jre")
}
